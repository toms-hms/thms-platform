"""Contractors assigned to a job, and where each one stands."""

from django.utils import timezone

from core.utils.unset_utils import UNSET, Unset
from jobs.models import CONTACTED_STATUSES, RESPONDED_STATUSES, JobContractor


class JobContractorService:
    """Assigns contractors to jobs and moves them through the outreach statuses."""

    def assign(self, *, job_id: str, contractor_id: str, notes: str | None = None) -> JobContractor:
        """Assigns the contractor to the job, or updates the notes on an existing assignment."""
        return JobContractor.objects.upsert(job_id=job_id, contractor_id=contractor_id, notes=notes)

    def update_status(
        self, *, job_contractor_id: str, status: str, notes: str | None | Unset = UNSET
    ) -> JobContractor:
        """Moves the assignment to the status, stamping first contact and first response the first time each happens."""
        assignment = JobContractor.objects.get_or_404(pk=job_contractor_id)
        now = timezone.now()
        stamps = {}
        if status in CONTACTED_STATUSES and not assignment.last_contacted_at:
            stamps["last_contacted_at"] = now
        if status in RESPONDED_STATUSES and not assignment.last_response_at:
            stamps["last_response_at"] = now
        return JobContractor.objects.apply_updates(assignment, status=status, notes=notes, **stamps)

    def remove(self, *, job_contractor_id: str) -> None:
        """Removes the contractor from the job."""
        JobContractor.objects.get_or_404(pk=job_contractor_id).delete()
