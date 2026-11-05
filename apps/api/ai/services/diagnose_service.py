"""The diagnostic Q&A that scopes a job before contractors are contacted."""

from typing import Any

from ai.clients.openai_client import OpenAIClient
from ai.utils.prompt_utils import DIAGNOSE_MODEL, job_context, read_tool_calls, system_prompt_for, tools_for
from core.errors import NotFoundError
from jobs.models import Job
from jobs.models.job.manager import JobManager


class DiagnoseService:
    """Runs the assistant's diagnostic conversation and persists the transcript on the job."""

    def __init__(self, *, openai: OpenAIClient | None = None, job_manager: JobManager | None = None) -> None:
        self._openai = openai or OpenAIClient()
        self._job_manager = job_manager or Job.objects

    def _ask(self, *, job: Job, history: list[dict[str, Any]]) -> Any:
        """Returns the assistant's next message given the transcript so far."""
        context = job_context(title=job.title, category=job.category, description=job.description)
        return self._openai.chat(
            model=DIAGNOSE_MODEL,
            messages=[
                {"role": "system", "content": f"{system_prompt_for(job.intent)}\n\n{context}"},
                *history,
            ],
            tools=tools_for(job.intent),
            tool_choice="required",
        )

    def start(self, *, job_id: str) -> dict[str, Any]:
        """Opens a diagnostic session and returns the assistant's first question."""
        job = self._job_manager.find(pk=job_id)
        if job is None:
            raise NotFoundError("Job")
        message = self._ask(job=job, history=[{"role": "user", "content": "Start the diagnostic."}])
        turn = read_tool_calls(message=message, existing_summary=None, intent=job.intent)
        messages = [{"role": "assistant", "content": turn["question"] or ""}]
        self._job_manager.apply_updates(job, ai_session={"messages": messages, "summary": None})
        return {**turn, "summary": None, "messages": messages}

    def answer(self, *, job_id: str, message: str) -> dict[str, Any]:
        """Runs one turn of the diagnostic with the user's answer and persists the updated transcript."""
        job = self._job_manager.find(pk=job_id)
        if job is None:
            raise NotFoundError("Job")
        session = job.ai_session or {"messages": [], "summary": None}
        history = [*session.get("messages", []), {"role": "user", "content": message}]
        reply = self._ask(job=job, history=[{"role": m["role"], "content": m["content"]} for m in history])
        turn = read_tool_calls(message=reply, existing_summary=session.get("summary"), intent=job.intent)
        messages = [*history, {"role": "assistant", "content": turn["question"] or "Brief complete."}]
        self._job_manager.apply_updates(job, ai_session={"messages": messages, "summary": turn["summary"]})
        return {**turn, "messages": messages}
