"""Filter compositions and writes for the job table."""

from core.managers import BaseManager
from jobs.models.job.queryset import JobQuerySet


class JobManager(BaseManager.from_queryset(JobQuerySet)):
    """Lookups for jobs."""

    def find_by_id(self, job_id: str):
        """Returns the job with this id, or None."""
        return self.filter_ids([job_id]).first()
