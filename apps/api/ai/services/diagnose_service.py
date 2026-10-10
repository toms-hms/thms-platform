"""The diagnostic Q&A that scopes a job before contractors are contacted."""

from typing import Any

from ai.clients.openai_client import OpenAIClient
from ai.utils.prompt_utils import DIAGNOSE_MODEL, job_context, read_tool_calls, system_prompt_for, tools_for
from jobs.models import Job


class DiagnoseService:
    """Runs the assistant's diagnostic conversation and persists the transcript on the job."""

    def __init__(self, *, openai: OpenAIClient | None = None) -> None:
        self.openai = openai or OpenAIClient()

    def _ask(self, *, job: Job, history: list[dict[str, Any]]) -> Any:
        """Returns the assistant's next message given the transcript so far."""
        context = job_context(title=job.title, category=job.category, description=job.description)
        return self.openai.chat(
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
        job = Job.objects.get_or_404(pk=job_id)
        message = self._ask(job=job, history=[{"role": "user", "content": "Start the diagnostic."}])
        turn = read_tool_calls(message=message, existing_summary=None, intent=job.intent)
        messages = [{"role": "assistant", "content": turn["question"] or ""}]
        Job.objects.apply_updates(job, ai_session={"messages": messages, "summary": None})
        return {**turn, "summary": None, "messages": messages}

    def answer(self, *, job_id: str, message: str) -> dict[str, Any]:
        """Runs one turn of the diagnostic with the user's answer and persists the updated transcript."""
        job = Job.objects.get_or_404(pk=job_id)
        session = job.ai_session or {"messages": [], "summary": None}
        history = [*session.get("messages", []), {"role": "user", "content": message}]
        reply = self._ask(job=job, history=[{"role": m["role"], "content": m["content"]} for m in history])
        turn = read_tool_calls(message=reply, existing_summary=session.get("summary"), intent=job.intent)
        messages = [*history, {"role": "assistant", "content": turn["question"] or "Brief complete."}]
        Job.objects.apply_updates(job, ai_session={"messages": messages, "summary": turn["summary"]})
        return {**turn, "messages": messages}
