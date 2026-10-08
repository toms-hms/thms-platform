"""Filter compositions and writes for the job contractor table."""

from django.utils import timezone

from core.managers import BaseManager
from jobs.models.job_contractor.queryset import JobContractorQuerySet


class JobContractorManager(BaseManager.from_queryset(JobContractorQuerySet)):
    """Lookups and status transitions for contractor assignments."""

    def list_for_job(self, job_id: str) -> JobContractorQuerySet:
        """Returns the contractor assignments for a job with contractors preloaded."""
        return self.filter_job_ids([job_id]).select_related("contractor")

    def upsert(self, job_id: str, contractor_id: str, notes: str | None = None):
        """Assigns the contractor to the job, updating the notes when the assignment already exists."""
        assignment, _ = self.update_or_create(
            job_id=job_id, contractor_id=contractor_id, defaults={"notes": notes}
        )
        return assignment

    def update_status(self, assignment_id: str, status: str, notes: str | None = None):
        """Moves the assignment to the given status, stamping first contact and first response once each."""
        from jobs.models import CONTACTED_STATUSES, RESPONDED_STATUSES

        assignment = self.get_or_404(pk=assignment_id)
        now = timezone.now()
        assignment.status = status
        if notes is not None:
            assignment.notes = notes
        if status in CONTACTED_STATUSES and not assignment.last_contacted_at:
            assignment.last_contacted_at = now
        if status in RESPONDED_STATUSES and not assignment.last_response_at:
            assignment.last_response_at = now
        assignment.save()
        return assignment
