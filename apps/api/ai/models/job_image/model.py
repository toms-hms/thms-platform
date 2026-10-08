"""The job image table."""

from django.db import models
from django.utils import timezone

from ai.models.job_image.manager import JobImageManager
from core.fields import CuidField, TimestampField
from core.ids import create_id


class JobImageKind:
    """Image roles. Stored as free text, not an enum, exactly as the column is defined."""

    SOURCE = "SOURCE"
    GENERATED = "GENERATED"


class JobImage(models.Model):
    """An image attached to a job, either uploaded by the user or produced by a generation."""

    id = CuidField(default=create_id)
    job = models.ForeignKey("jobs.Job", on_delete=models.CASCADE, db_column="jobId", related_name="images")
    storage_key = models.TextField(db_column="storageKey")
    kind = models.TextField(default=JobImageKind.SOURCE)
    label = models.TextField(null=True, blank=True)
    ai_generation = models.ForeignKey(
        "ai.AIGeneration",
        on_delete=models.DO_NOTHING,
        db_column="aiGenerationId",
        null=True,
        blank=True,
        related_name="images",
    )
    uploaded_by = models.ForeignKey(
        "accounts.User", on_delete=models.DO_NOTHING, db_column="uploadedById", related_name="uploaded_images"
    )
    created_at = TimestampField(db_column="createdAt", default=timezone.now)

    objects = JobImageManager()

    class Meta:
        db_table = "JobImage"
        ordering = ["created_at"]

    def __str__(self) -> str:
        return self.storage_key
