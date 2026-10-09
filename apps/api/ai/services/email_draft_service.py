"""Outreach email drafts for the contractors on a job."""

import json

from ai.clients.openai_client import OpenAIClient
from ai.models import AIGeneration, AIGenerationStatus
from ai.utils.prompt_utils import EMAIL_MODEL, EMAIL_SYSTEM_PROMPT, outreach_email_prompt
from contractors.models import Contractor
from jobs.models import Job


class EmailDraftService:
    """Drafts one outreach email per contractor and records each generation against the job."""

    def __init__(self, *, openai: OpenAIClient | None = None) -> None:
        self.openai = openai or OpenAIClient()

    def draft(
        self,
        *,
        job_id: str,
        user_id: str,
        contractor_ids: list[str],
        tone: str = "professional",
        include_images: bool = False,
        custom_instructions: str | None = None,
    ) -> list[dict[str, str]]:
        """Returns one draft per contractor. A contractor whose reply is empty is skipped."""
        job = Job.objects.select_related("home").get_or_404(pk=job_id)
        drafts: list[dict[str, str]] = []
        for contractor in Contractor.objects.filter_ids(contractor_ids):
            user_prompt = outreach_email_prompt(
                contractor_name=contractor.name,
                company_name=contractor.company_name,
                job_title=job.title,
                job_category=job.category,
                job_description=job.description,
                city=job.home.city,
                state=job.home.state,
                custom_instructions=custom_instructions,
            )
            message = self.openai.chat(
                model=EMAIL_MODEL,
                messages=[
                    {"role": "system", "content": EMAIL_SYSTEM_PROMPT.format(tone=tone)},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
            )
            if not message.content:
                continue
            parsed = json.loads(message.content)
            AIGeneration.objects.create(
                job_id=job_id,
                prompt=user_prompt,
                provider="openai",
                status=AIGenerationStatus.COMPLETED,
                metadata={"contractorId": str(contractor.pk), "type": "EMAIL_DRAFT"},
                created_by_id=user_id,
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
