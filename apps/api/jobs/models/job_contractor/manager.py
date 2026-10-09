"""Filter compositions and generic writes for the job contractor table."""

from core.managers import BaseManager
from jobs.models.job_contractor.queryset import JobContractorQuerySet


class JobContractorManager(BaseManager.from_queryset(JobContractorQuerySet)):
    """Lookups and the assignment upsert for contractor assignments."""

    def list_for_job(self, job_id: str) -> JobContractorQuerySet:
        """Returns the contractor assignments for a job with contractors preloaded."""
        return self.filter_job_ids([job_id]).select_related("contractor")

    def upsert(self, *, job_id: str, contractor_id: str, notes: str | None = None):
        """Assigns the contractor to the job, updating the notes when the assignment already exists."""
        assignment, _ = self.update_or_create(
            job_id=job_id, contractor_id=contractor_id, defaults={"notes": notes}
        )
        return assignment
