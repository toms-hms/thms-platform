"""The AI assistant: diagnostic Q&A, outreach email drafts and image generation.

Every call to the provider is recorded as an AIGeneration row, so a job's AI
history is auditable after the fact. The OpenAI client is constructed per call
so tests can patch `ai.services.get_openai_client`.
"""

import json
from typing import Any
from uuid import uuid4

import requests
from django.conf import settings
from openai import OpenAI

from ai.models import AIGeneration, AIGenerationStatus, JobImage, JobImageKind
from ai.prompts import (
    ASK_QUESTION_TOOL,
    DIAGNOSE_MODEL,
    EMAIL_MODEL,
    EMAIL_SYSTEM_PROMPT,
    IMAGE_MODEL,
    SUGGEST_CATEGORIES_TOOL,
    SUMMARY_TOOLS,
    SYSTEM_PROMPTS,
)
from core.errors import BadRequestError, NotFoundError
from jobs.models import Job, JobIntent
from uploads import services as uploads


def get_openai_client() -> OpenAI:
    """Returns an OpenAI client, raising when no API key is configured."""
    if not settings.OPENAI_API_KEY:
        raise BadRequestError("OpenAI API key not configured")
    return OpenAI(api_key=settings.OPENAI_API_KEY)


def _job_context(job: Job) -> str:
    """Returns the job's title, category and description as prompt context."""
    lines = [f"Job title: {job.title}", f"Category: {job.category}"]
    if job.description:
        lines.append(f"Homeowner's description: {job.description}")
    return "\n".join(lines)


def _read_tool_calls(message: Any, existing_summary: Any, intent: str) -> dict[str, Any]:
    """Returns the question, options, summary and category suggestions carried by one assistant turn."""
    result: dict[str, Any] = {
        "question": None,
        "options": [],
        "summary": existing_summary,
        "suggested_categories": None,
    }
    for tool_call in getattr(message, "tool_calls", None) or []:
        args = json.loads(tool_call.function.arguments)
        if tool_call.function.name == "ask_question":
            result["question"] = args.get("question")
            result["options"] = args.get("options") or []
        elif tool_call.function.name == "generate_summary":
            result["summary"] = {"intent": intent, **args}
        elif tool_call.function.name == "suggest_categories":
            result["suggested_categories"] = args.get("suggestions") or []
    return result


def _tools_for(intent: str) -> list[dict[str, Any]]:
    """Returns the tool set offered to the assistant for this job intent."""
    summary_tool = SUMMARY_TOOLS.get(intent, SUMMARY_TOOLS[JobIntent.ISSUE])
    return [ASK_QUESTION_TOOL, SUGGEST_CATEGORIES_TOOL, summary_tool]


def start_diagnose(job_id: str) -> dict[str, Any]:
    """Opens a diagnostic session and returns the assistant's first question."""
    job = Job.objects.get_or_404(pk=job_id)
    intent = job.intent
    system_prompt = SYSTEM_PROMPTS.get(intent, SYSTEM_PROMPTS[JobIntent.ISSUE])

    response = get_openai_client().chat.completions.create(
        model=DIAGNOSE_MODEL,
        messages=[
            {"role": "system", "content": f"{system_prompt}\n\n{_job_context(job)}"},
            {"role": "user", "content": "Start the diagnostic."},
        ],
        tools=_tools_for(intent),
        tool_choice="required",
    )

    turn = _read_tool_calls(response.choices[0].message, None, intent)
    messages = [{"role": "assistant", "content": turn["question"] or ""}]
    job.ai_session = {"messages": messages, "summary": None}
    job.save(update_fields=["ai_session", "updated_at"])

    return {**turn, "summary": None, "messages": messages}


def diagnose_job(job_id: str, user_message: str) -> dict[str, Any]:
    """Runs one turn of the diagnostic Q&A and persists the updated transcript."""
    job = Job.objects.get_or_404(pk=job_id)
    intent = job.intent
    system_prompt = SYSTEM_PROMPTS.get(intent, SYSTEM_PROMPTS[JobIntent.ISSUE])

    session = job.ai_session or {"messages": [], "summary": None}
    history = [*session.get("messages", []), {"role": "user", "content": user_message}]

    response = get_openai_client().chat.completions.create(
        model=DIAGNOSE_MODEL,
        messages=[
            {"role": "system", "content": f"{system_prompt}\n\n{_job_context(job)}"},
            *[{"role": m["role"], "content": m["content"]} for m in history],
        ],
        tools=_tools_for(intent),
        tool_choice="required",
    )

    turn = _read_tool_calls(response.choices[0].message, session.get("summary"), intent)
    messages = [*history, {"role": "assistant", "content": turn["question"] or "Brief complete."}]
    job.ai_session = {"messages": messages, "summary": turn["summary"]}
    job.save(update_fields=["ai_session", "updated_at"])

    return {**turn, "messages": messages}


def draft_email(
    *,
    job_id: str,
    user_id: str,
    contractor_ids: list[str],
    tone: str = "professional",
    include_images: bool = False,
    custom_instructions: str | None = None,
) -> list[dict[str, str]]:
    """Returns one outreach email draft per contractor, recording each generation against the job."""
    from contractors.models import Contractor
    from homes.models import Home

    job = Job.objects.get_or_404(pk=job_id)
    home = Home.objects.filter(pk=job.home_id).first()
    if not home:
        raise NotFoundError("Home")

    client = get_openai_client()
    drafts: list[dict[str, str]] = []

    for contractor in Contractor.objects.filter_contractors(ids=contractor_ids):
        company = f" at {contractor.company_name}" if contractor.company_name else ""
        instructions = f"Additional instructions: {custom_instructions}" if custom_instructions else ""
        user_prompt = (
            f"Write an outreach email to {contractor.name}{company} for the following project:\n\n"
            f"Job: {job.title}\n"
            f"Category: {job.category}\n"
            f"Description: {job.description or 'Not provided'}\n"
            f"Location: {home.city}, {home.state}\n\n"
            f"{instructions}\n\n"
            "Return a JSON object with these fields:\n"
            "- subject: email subject line\n"
            "- bodyText: plain text email body\n"
            "- bodyHtml: HTML formatted email body"
        )

        response = client.chat.completions.create(
            model=EMAIL_MODEL,
            messages=[
                {"role": "system", "content": EMAIL_SYSTEM_PROMPT.format(tone=tone)},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content
        if not content:
            continue
        parsed = json.loads(content)

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
                "contractor_id": contractor.pk,
                "subject": parsed.get("subject", ""),
                "body_text": parsed.get("bodyText", ""),
                "body_html": parsed.get("bodyHtml", ""),
            }
        )

    return drafts


def generate_image(
    *,
    job_id: str,
    user_id: str,
    source_image_id: str,
    prompt: str,
    provider: str = "openai",
    metadata: dict[str, Any] | None = None,
) -> AIGeneration:
    """Generates a visualisation from a source image, storing the result as a new job image."""
    source_image = JobImage.objects.filter(pk=source_image_id).first()
    if not source_image:
        raise NotFoundError("Source image")

    generation = AIGeneration.objects.create(
        job_id=job_id,
        original_image_url=uploads.get_download_url(source_image.storage_key),
        prompt=prompt,
        provider=provider,
        status=AIGenerationStatus.PROCESSING,
        metadata=metadata,
        created_by_id=user_id,
    )

    try:
        response = get_openai_client().images.generate(
            model=IMAGE_MODEL,
            prompt=(
                f"{prompt}. Important: Only modify the outdoor/yard areas as described. "
                "Do not change the structure, style, or appearance of the house."
            ),
            n=1,
            size="1024x1024",
            quality="standard",
        )
        image_url = response.data[0].url if response.data else None
        if not image_url:
            raise BadRequestError("No image URL returned from OpenAI")

        image_bytes = requests.get(image_url, timeout=60).content
        key = f"jobs/{job_id}/generated/{uuid4()}.png"
        uploads.put_object(key, image_bytes, "image/png")

        JobImage.objects.create(
            job_id=job_id,
            storage_key=key,
            kind=JobImageKind.GENERATED,
            label=f"AI Generated: {prompt[:50]}",
            ai_generation=generation,
            uploaded_by_id=user_id,
        )

        generation.generated_image_url = uploads.get_download_url(key)
        generation.status = AIGenerationStatus.COMPLETED
        generation.save(update_fields=["generated_image_url", "status", "updated_at"])
        return generation
    except Exception:
        generation.status = AIGenerationStatus.FAILED
        generation.save(update_fields=["status", "updated_at"])
        raise


def retry_generation(generation_id: str, user_id: str) -> AIGeneration:
    """Re-runs a failed generation against the job's source image."""
    generation = AIGeneration.objects.get_or_404(pk=generation_id)
    if generation.status != AIGenerationStatus.FAILED:
        raise BadRequestError("Can only retry failed generations")

    source_image = JobImage.objects.find_source_image(generation.job_id)
    if not source_image:
        raise NotFoundError("Source image")

    return generate_image(
        job_id=generation.job_id,
        user_id=user_id,
        source_image_id=source_image.pk,
        prompt=generation.prompt,
        provider=generation.provider,
        metadata=generation.metadata,
    )
