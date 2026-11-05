"""The ai generation table."""

from django.db import models

from ai.models.ai_generation.manager import AIGenerationManager
from core.models import BaseModel


class AIGenerationStatus(models.TextChoices):
    """Lifecycle of a single generation request."""

    PENDING = "PENDING", "Pending"
    PROCESSING = "PROCESSING", "Processing"
    COMPLETED = "COMPLETED", "Completed"
    FAILED = "FAILED", "Failed"


class AIGeneration(BaseModel):
    """One call to an AI provider — an image generation or an email draft."""

    job = models.ForeignKey("jobs.Job", on_delete=models.CASCADE, related_name="ai_generations")
    original_image_url = models.TextField(null=True, blank=True)
    prompt = models.TextField()
    generated_image_url = models.TextField(null=True, blank=True)
    provider = models.TextField()
    status = models.CharField(
        max_length=32, choices=AIGenerationStatus.choices, default=AIGenerationStatus.PENDING
    )
    metadata = models.JSONField(null=True, blank=True)
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        related_name="ai_generations",
    )

    objects = AIGenerationManager()

    class Meta:
        ordering = ["created_at"]
