"""The job image table."""

import uuid

from django.db import models
from django.utils import timezone

from ai.models.job_image.manager import JobImageManager


class JobImageKind:
    """Image roles. Stored as free text, not an enum, exactly as the column is defined."""

    SOURCE = "SOURCE"
    GENERATED = "GENERATED"


class JobImage(models.Model):
    """An image attached to a job, either uploaded by the user or produced by a generation."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey("jobs.Job", on_delete=models.CASCADE, related_name="images")
    storage_key = models.TextField()
    kind = models.TextField(default=JobImageKind.SOURCE)
    label = models.TextField(null=True, blank=True)
    ai_generation = models.ForeignKey(
        "ai.AIGeneration",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="images",
    )
    uploaded_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT, related_name="uploaded_images")
    created_at = models.DateTimeField(default=timezone.now)

    objects = JobImageManager()

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return self.storage_key
