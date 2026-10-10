"""Filter compositions and writes for the job image table."""

from ai.models.job_image.queryset import JobImageQuerySet
from core.managers import BaseManager


class JobImageManager(BaseManager.from_queryset(JobImageQuerySet)):
    """Lookups over job images."""

    def list_for_job(self, job_id: str) -> JobImageQuerySet:
        """Returns the images attached to a job, oldest first."""
        return self.filter_job_ids([job_id])

    def find_source_image(self, job_id: str):
        """Returns the first user-uploaded source image for the job, or None."""
        from ai.models import JobImageKind

        return self.filter_job_ids([job_id]).filter_kinds([JobImageKind.SOURCE]).first()
