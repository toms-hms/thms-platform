"""Filter compositions and writes for the job image table."""

from ai.models.job_image.queryset import JobImageQuerySet
from core.managers import BaseManager


class JobImageManager(BaseManager.from_queryset(JobImageQuerySet)):
    """Lookups over job images."""

    def find_source_image(self, job_id: str):
        """Returns the first user-uploaded source image for the job, or None."""
        from ai.models import JobImageKind

        return self.filter_job_ids([job_id]).filter_job_image_kinds([JobImageKind.SOURCE]).first()
