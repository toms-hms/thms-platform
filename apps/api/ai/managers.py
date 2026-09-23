"""Query methods for AI generations and job images."""

from django.db import models

from core.managers import BaseManager


class AIGenerationManager(BaseManager):
    """Lookups over generation records."""

    def list_for_job(self, job_id: str) -> models.QuerySet:
        """Returns the generations recorded against a job, oldest first."""
        return self.filter(job_id=job_id)


class JobImageManager(BaseManager):
    """Lookups over job images."""

    def list_for_job(self, job_id: str) -> models.QuerySet:
        """Returns the images attached to a job, oldest first."""
        return self.filter(job_id=job_id)

    def find_source_image(self, job_id: str):
        """Returns the first user-uploaded source image for the job, or None."""
        from ai.models import JobImageKind

        return self.filter(job_id=job_id, kind=JobImageKind.SOURCE).first()
