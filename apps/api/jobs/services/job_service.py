"""Jobs on a home.

`ai_session` carries the diagnostic transcript plus the categories the user
confirmed. Status is never moved automatically — the user controls every
transition (see .ai/rules/core.md).
"""

from typing import Any

from core.utils.unset_utils import UNSET, Unset, is_set
from jobs.models import Job, JobIntent, JobStatus
from jobs.utils.ai_session_utils import build_ai_session


class JobService:
    """Creates, edits and deletes jobs."""

    def create(
        self,
        *,
        home_id: str,
        user_id: str,
        title: str,
        category: str,
        intent: str | None = None,
        categories: list[str] | None = None,
        description: str | None = None,
        notes: str | None = None,
        status: str | None = None,
        ai_session: dict[str, Any] | None = None,
    ) -> Job:
        """Creates a job on the home. The categories the user confirmed are recorded in the AI session."""
        confirmed_categories = categories or [category]
        return Job.objects.create(
            home_id=home_id,
            created_by_id=user_id,
            title=title,
            intent=intent or JobIntent.ISSUE,
            category=category,
            description=description,
            notes=notes,
            status=status or JobStatus.DRAFT,
            ai_session=build_ai_session(ai_session=ai_session, confirmed_categories=confirmed_categories),
        )

    def update(
        self,
        *,
        job_id: str,
        title: str | Unset = UNSET,
        category: str | Unset = UNSET,
        intent: str | Unset = UNSET,
        categories: list[str] | None | Unset = UNSET,
        description: str | None | Unset = UNSET,
        notes: str | None | Unset = UNSET,
        status: str | Unset = UNSET,
        ai_session: dict[str, Any] | None | Unset = UNSET,
    ) -> Job:
        """Applies the provided fields, keeping the primary category in step with the confirmed categories.

        The first confirmed category (from `categories`, else the session's
        confirmedCategories) becomes the job's category, overriding `category`.
        """
        job = Job.objects.get_or_404(pk=job_id)
        session = ai_session if is_set(ai_session) else None
        confirmed = (categories if is_set(categories) else None) or (session or {}).get("confirmedCategories")
        primary_category = confirmed[0] if confirmed else category
        new_session = build_ai_session(ai_session=session, confirmed_categories=confirmed)
        return Job.objects.apply_updates(
            job,
            title=title,
            intent=intent,
            description=description,
            notes=notes,
            status=status,
            category=primary_category,
            ai_session=new_session if new_session is not None else UNSET,
        )

    def delete(self, *, job_id: str) -> None:
        """Deletes the job and everything cascading from it."""
        Job.objects.filter_ids([job_id]).delete()
