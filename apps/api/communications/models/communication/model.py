"""The communication table."""

import uuid

from django.db import models
from django.utils import timezone

from communications.models.communication.manager import CommunicationManager


class CommunicationChannel(models.TextChoices):
    """How the message was exchanged."""

    EMAIL = "EMAIL", "Email"


class CommunicationDirection(models.TextChoices):
    """Whether the platform sent the message or received it."""

    SENT = "SENT", "Sent"
    RECEIVED = "RECEIVED", "Received"


class Communication(models.Model):
    """One message sent to, or received from, a contractor."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey(
        "jobs.Job",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="communications",
    )
    contractor = models.ForeignKey(
        "contractors.Contractor",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="communications",
    )
    channel = models.CharField(
        max_length=32,
        choices=CommunicationChannel.choices,
        default=CommunicationChannel.EMAIL,
    )
    direction = models.CharField(max_length=32, choices=CommunicationDirection.choices)
    subject = models.TextField(null=True, blank=True)
    body_text = models.TextField(null=True, blank=True)
    body_html = models.TextField(null=True, blank=True)
    external_thread_id = models.TextField(null=True, blank=True)
    external_message_id = models.TextField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    received_at = models.DateTimeField(null=True, blank=True)
    parsed_summary = models.TextField(null=True, blank=True)
    needs_review = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    objects = CommunicationManager()

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return self.subject or f"{self.direction} {self.id}"
