"""Job creation and the contractor assignments hanging off it.

`ai_session` carries the diagnostic transcript plus the categories the user
confirmed. Status is never moved automatically — the user controls every
transition (see .ai/rules/core.md).
"""

from typing import Any

from core.errors import NotFoundError
from jobs.models import Job, JobContractor, JobIntent, JobStatus


def _build_ai_session(data: dict[str, Any], confirmed_categories: list[str] | None) -> dict[str, Any] | None:
    """Returns the ai_session payload to persist, or None when the write carries no session data."""
    session = data.get("ai_session")
    if not session and not confirmed_categories:
        return None
    return {
        "messages": (session or {}).get("messages") or [],
        "summary": (session or {}).get("summary"),
        "categorySuggestions": (session or {}).get("categorySuggestions"),
        "confirmedCategories": confirmed_categories,
    }


def create_job(home_id: str, user_id: str, data: dict[str, Any]) -> Job:
    """Creates a job on the home. Categories confirmed by the user are recorded in the AI session."""
    categories = data.get("categories") or []
    confirmed_categories = categories or [data["category"]]
    return Job.objects.create(
        home_id=home_id,
        created_by_id=user_id,
        title=data["title"],
        intent=data.get("intent") or JobIntent.ISSUE,
        category=data["category"],
        description=data.get("description"),
        notes=data.get("notes"),
        status=data.get("status") or JobStatus.DRAFT,
        ai_session=_build_ai_session(data, confirmed_categories),
    )


def update_job(job_id: str, data: dict[str, Any]) -> Job:
    """Applies field updates to the job, keeping category and confirmed categories in step."""
    job = Job.objects.get_or_404(pk=job_id)
    categories = data.get("categories") or []
    session = data.get("ai_session") or {}
    confirmed_categories = categories or session.get("confirmedCategories")

    for field in ("title", "intent", "description", "notes", "status"):
        if data.get(field) is not None:
            setattr(job, field, data[field])

    category = (confirmed_categories or [None])[0] or data.get("category")
    if category:
        job.category = category

    ai_session = _build_ai_session(data, confirmed_categories)
    if ai_session is not None:
        job.ai_session = ai_session

    job.save()
    return job


def delete_job(job_id: str) -> None:
    """Deletes the job and everything cascading from it."""
    Job.objects.filter(pk=job_id).delete()


def assign_contractor(job_id: str, contractor_id: str, notes: str | None = None) -> JobContractor:
    """Assigns a contractor to the job, or updates the notes on an existing assignment."""
    return JobContractor.objects.upsert(job_id, contractor_id, notes)


def update_job_contractor_status(
    job_contractor_id: str, status: str, notes: str | None = None
) -> JobContractor:
    """Moves a contractor assignment to a new status."""
    if not JobContractor.objects.filter(pk=job_contractor_id).exists():
        raise NotFoundError("JobContractor")
    return JobContractor.objects.update_status(job_contractor_id, status, notes)


def remove_contractor_from_job(job_contractor_id: str) -> None:
    """Removes a contractor from the job."""
    assignment = JobContractor.objects.filter(pk=job_contractor_id).first()
    if not assignment:
        raise NotFoundError("JobContractor")
    assignment.delete()
