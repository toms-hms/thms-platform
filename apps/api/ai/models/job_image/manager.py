"""Filter compositions and writes for the job image table."""

from ai.models.job_image.queryset import JobImageQuerySet
from core.managers import BaseManager


class JobImageManager(BaseManager.from_queryset(JobImageQuerySet)):
    """Lookups over job images."""
