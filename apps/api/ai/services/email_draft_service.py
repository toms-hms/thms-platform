"""Outreach email drafts for the contractors on a job."""

import json

from ai.clients.openai_client import OpenAIClient
from ai.models import AIGeneration, AIGenerationStatus
from ai.models.ai_generation.manager import AIGenerationManager
from ai.utils.prompt_utils import EMAIL_MODEL, EMAIL_SYSTEM_PROMPT, outreach_email_prompt
from contractors.models import Contractor
from contractors.models.contractor.manager import ContractorManager
from core.errors import NotFoundError
from jobs.models import Job
from jobs.models.job.manager import JobManager


class EmailDraftService:
    """Drafts one outreach email per contractor and records each generation against the job."""

    def __init__(
        self,
        *,
        ai_generation_manager: AIGenerationManager | None = None,
        contractor_manager: ContractorManager | None = None,
        job_manager: JobManager | None = None,
        openai: OpenAIClient | None = None,
    ) -> None:
        self._ai_generation_manager = ai_generation_manager or AIGeneration.objects
        self._contractor_manager = contractor_manager or Contractor.objects
        self._job_manager = job_manager or Job.objects
        self._openai = openai or OpenAIClient()

    def draft(
        self,
        *,
        contractor_ids: list[str],
        job_id: str,
        user_id: str,
        custom_instructions: str | None = None,
        include_images: bool = False,
        tone: str = "professional",
    ) -> list[dict[str, str]]:
        """Returns one draft per contractor. A contractor whose reply is empty is skipped."""
        job = self._job_manager.find(pk=job_id)
        if job is None:
            raise NotFoundError("Job")
        drafts: list[dict[str, str]] = []
        for contractor in self._contractor_manager.filter_ids(contractor_ids):
            user_prompt = outreach_email_prompt(
                city=job.home.city,
                company_name=contractor.company_name,
                contractor_name=contractor.name,
                custom_instructions=custom_instructions,
                job_category=job.category,
                job_description=job.description,
                job_title=job.title,
                state=job.home.state,
            )
            message = self._openai.chat(
                messages=[
                    {"role": "system", "content": EMAIL_SYSTEM_PROMPT.format(tone=tone)},
                    {"role": "user", "content": user_prompt},
                ],
                model=EMAIL_MODEL,
                response_format={"type": "json_object"},
            )
            if not message.content:
                continue
            parsed = json.loads(message.content)
            self._ai_generation_manager.create(
                created_by_id=user_id,
                job_id=job_id,
                metadata={"contractorId": str(contractor.pk), "type": "EMAIL_DRAFT"},
                prompt=user_prompt,
                provider="openai",
                status=AIGenerationStatus.COMPLETED,
            )
            drafts.append(
                {
                    "contractor_id": str(contractor.pk),
                    "subject": parsed.get("subject", ""),
                    "body_text": parsed.get("bodyText", ""),
                    "body_html": parsed.get("bodyHtml", ""),
                }
            )
        return drafts
