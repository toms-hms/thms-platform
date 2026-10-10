"""The ai generation table."""

import uuid

from django.db import models
from django.utils import timezone

from ai.models.ai_generation.manager import AIGenerationManager


class AIGenerationStatus(models.TextChoices):
    """Lifecycle of a single generation request."""

    PENDING = "PENDING", "Pending"
    PROCESSING = "PROCESSING", "Processing"
    COMPLETED = "COMPLETED", "Completed"
    FAILED = "FAILED", "Failed"


class AIGeneration(models.Model):
    """One call to an AI provider — an image generation or an email draft."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
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
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    objects = AIGenerationManager()

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"{self.provider}:{self.status}"
