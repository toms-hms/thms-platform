"""Contractors assigned to a job, and where each one stands."""

from django.utils import timezone

from core.errors import NotFoundError
from core.utils.unset_utils import UNSET, Unset
from jobs.models import CONTACTED_STATUSES, RESPONDED_STATUSES, JobContractor
from jobs.models.job_contractor.manager import JobContractorManager


class JobContractorService:
    """Assigns contractors to jobs and moves them through the outreach statuses."""

    def __init__(self, *, job_contractor_manager: JobContractorManager | None = None) -> None:
        self._job_contractor_manager = job_contractor_manager or JobContractor.objects

    def create(self, *, contractor_id: str, job_id: str, notes: str | None = None) -> JobContractor:
        """Assigns the contractor to the job, or updates the notes on an existing assignment."""
        return self._job_contractor_manager.upsert(contractor_id=contractor_id, job_id=job_id, notes=notes)

    def update(
        self, *, job_contractor_id: str, status: str, notes: str | None | Unset = UNSET
    ) -> JobContractor:
        """Moves the assignment to the status, stamping first contact and first response the first time each happens."""
        assignment = self._job_contractor_manager.find(pk=job_contractor_id)
        if assignment is None:
            raise NotFoundError("JobContractor")
        now = timezone.now()
        stamps = {}
        if status in CONTACTED_STATUSES and not assignment.last_contacted_at:
            stamps["last_contacted_at"] = now
        if status in RESPONDED_STATUSES and not assignment.last_response_at:
            stamps["last_response_at"] = now
        return self._job_contractor_manager.apply_updates(assignment, notes=notes, status=status, **stamps)

    def delete(self, *, job_contractor_id: str) -> None:
        """Removes the contractor from the job."""
        job_contractor = self._job_contractor_manager.find(pk=job_contractor_id)
        if job_contractor is None:
            raise NotFoundError("JobContractor")
        self._job_contractor_manager.delete(job_contractor)
