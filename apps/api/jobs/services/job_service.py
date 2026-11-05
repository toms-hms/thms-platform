"""Jobs on a home.

`ai_session` carries the diagnostic transcript plus the categories the user
confirmed. Status is never moved automatically — the user controls every
transition (see .ai/rules/core.md).
"""

from typing import Any

from core.errors import NotFoundError
from core.utils.unset_utils import UNSET, Unset, is_set
from jobs.models import Job, JobIntent, JobStatus
from jobs.models.job.manager import JobManager
from jobs.utils.ai_session_utils import build_ai_session


class JobService:
    """Creates, edits and deletes jobs."""

    def __init__(self, *, job_manager: JobManager | None = None) -> None:
        self._job_manager = job_manager or Job.objects

    def create(
        self,
        *,
        home_id: str,
        user_id: str,
        category: str,
        title: str,
        ai_session: dict[str, Any] | None = None,
        categories: list[str] | None = None,
        description: str | None = None,
        intent: str | None = None,
        notes: str | None = None,
        status: str | None = None,
    ) -> Job:
        """Creates a job on the home. The categories the user confirmed are recorded in the AI session."""
        confirmed_categories = categories or [category]
        return self._job_manager.create(
            created_by_id=user_id,
            home_id=home_id,
            ai_session=build_ai_session(ai_session=ai_session, confirmed_categories=confirmed_categories),
            category=category,
            description=description,
            intent=intent or JobIntent.ISSUE,
            notes=notes,
            status=status or JobStatus.DRAFT,
            title=title,
        )

    def update(
        self,
        *,
        job_id: str,
        ai_session: dict[str, Any] | None | Unset = UNSET,
        categories: list[str] | None | Unset = UNSET,
        category: str | Unset = UNSET,
        description: str | None | Unset = UNSET,
        intent: str | Unset = UNSET,
        notes: str | None | Unset = UNSET,
        status: str | Unset = UNSET,
        title: str | Unset = UNSET,
    ) -> Job:
        """Applies the provided fields, keeping the primary category in step with the confirmed categories.

        The first confirmed category (from `categories`, else the session's
        confirmedCategories) becomes the job's category, overriding `category`.
        """
        job = self._job_manager.find(pk=job_id)
        if job is None:
            raise NotFoundError("Job")
        session = ai_session if is_set(ai_session) else None
        confirmed = (categories if is_set(categories) else None) or (session or {}).get("confirmedCategories")
        primary_category = confirmed[0] if confirmed else category
        new_session = build_ai_session(ai_session=session, confirmed_categories=confirmed)
        return self._job_manager.apply_updates(
            job,
            ai_session=new_session if new_session is not None else UNSET,
            category=primary_category,
            description=description,
            intent=intent,
            notes=notes,
            status=status,
            title=title,
        )

    def delete(self, *, job_id: str) -> None:
        """Deletes the job and everything cascading from it."""
        job = self._job_manager.find(pk=job_id)
        if job is None:
            raise NotFoundError("Job")
        self._job_manager.delete(job)
