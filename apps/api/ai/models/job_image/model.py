"""The job image table."""

from django.db import models

from ai.models.job_image.manager import JobImageManager
from core.models import BaseModel


class JobImageKind(models.TextChoices):
    """Whether an image was uploaded by the user or produced by an AI generation."""

    SOURCE = "SOURCE", "Source"
    GENERATED = "GENERATED", "Generated"


class JobImage(BaseModel):
    """An image attached to a job, either uploaded by the user or produced by a generation."""

    job = models.ForeignKey("jobs.Job", on_delete=models.CASCADE, related_name="images")
    storage_key = models.TextField()
    kind = models.CharField(max_length=32, choices=JobImageKind.choices, default=JobImageKind.SOURCE)
    label = models.TextField(null=True, blank=True)
    ai_generation = models.ForeignKey(
        "ai.AIGeneration",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="images",
    )
    uploaded_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT, related_name="uploaded_images")

    objects = JobImageManager()

    class Meta:
        ordering = ["created_at"]
