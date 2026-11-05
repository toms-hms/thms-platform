"""Filter compositions and writes for the job table."""

from core.managers import BaseManager
from jobs.models.job.queryset import JobQuerySet


class JobManager(BaseManager.from_queryset(JobQuerySet)):
    """Lookups for jobs."""
