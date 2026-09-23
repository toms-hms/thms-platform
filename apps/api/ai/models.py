"""AI generations and the job images they read from and write to."""

from django.db import models
from django.utils import timezone

from ai.managers import AIGenerationManager, JobImageManager
from core.fields import CuidField, JsonField, PGEnumField, TimestampField
from core.ids import create_id


class AIGenerationStatus(models.TextChoices):
    """Lifecycle of a single generation request."""

    PENDING = "PENDING", "Pending"
    PROCESSING = "PROCESSING", "Processing"
    COMPLETED = "COMPLETED", "Completed"
    FAILED = "FAILED", "Failed"


class JobImageKind:
    """Image roles. Stored as free text, not an enum, exactly as the column is defined."""

    SOURCE = "SOURCE"
    GENERATED = "GENERATED"


class AIGeneration(models.Model):
    """One call to an AI provider — an image generation or an email draft."""

    id = CuidField(default=create_id)
    job = models.ForeignKey(
        "jobs.Job", on_delete=models.CASCADE, db_column="jobId", related_name="ai_generations"
    )
    original_image_url = models.TextField(db_column="originalImageUrl", null=True, blank=True)
    prompt = models.TextField()
    generated_image_url = models.TextField(db_column="generatedImageUrl", null=True, blank=True)
    provider = models.TextField()
    status = PGEnumField(
        enum_type="AIGenerationStatus", choices=AIGenerationStatus.choices, default=AIGenerationStatus.PENDING
    )
    metadata = JsonField(null=True, blank=True)
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.DO_NOTHING,
        db_column="createdByUserId",
        related_name="ai_generations",
    )
    created_at = TimestampField(db_column="createdAt", default=timezone.now)
    updated_at = TimestampField(db_column="updatedAt", auto_now=True)

    objects = AIGenerationManager()

    class Meta:
        db_table = "AIGeneration"
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"{self.provider}:{self.status}"


class JobImage(models.Model):
    """An image attached to a job, either uploaded by the user or produced by a generation."""

    id = CuidField(default=create_id)
    job = models.ForeignKey("jobs.Job", on_delete=models.CASCADE, db_column="jobId", related_name="images")
    storage_key = models.TextField(db_column="storageKey")
    kind = models.TextField(default=JobImageKind.SOURCE)
    label = models.TextField(null=True, blank=True)
    ai_generation = models.ForeignKey(
        AIGeneration,
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
