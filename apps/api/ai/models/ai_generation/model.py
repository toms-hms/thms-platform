"""The ai generation table."""

from django.db import models
from django.utils import timezone

from ai.models.ai_generation.manager import AIGenerationManager
from core.fields import CuidField, JsonField, PGEnumField, TimestampField
from core.ids import create_id


class AIGenerationStatus(models.TextChoices):
    """Lifecycle of a single generation request."""

    PENDING = "PENDING", "Pending"
    PROCESSING = "PROCESSING", "Processing"
    COMPLETED = "COMPLETED", "Completed"
    FAILED = "FAILED", "Failed"


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
