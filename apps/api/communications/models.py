"""Email exchanged with contractors about a job."""

from django.db import models
from django.utils import timezone

from communications.managers import CommunicationManager
from core.fields import CuidField, PGEnumField, TimestampField
from core.ids import create_id


class CommunicationChannel(models.TextChoices):
    """How the message was exchanged."""

    EMAIL = "EMAIL", "Email"


class CommunicationDirection(models.TextChoices):
    """Whether the platform sent the message or received it."""

    SENT = "SENT", "Sent"
    RECEIVED = "RECEIVED", "Received"


class Communication(models.Model):
    """One message sent to, or received from, a contractor."""

    id = CuidField(default=create_id)
    job = models.ForeignKey(
        "jobs.Job",
        on_delete=models.DO_NOTHING,
        db_column="jobId",
        null=True,
        blank=True,
        related_name="communications",
    )
    contractor = models.ForeignKey(
        "contractors.Contractor",
        on_delete=models.DO_NOTHING,
        db_column="contractorId",
        null=True,
        blank=True,
        related_name="communications",
    )
    channel = PGEnumField(
        enum_type="CommunicationChannel",
        choices=CommunicationChannel.choices,
        default=CommunicationChannel.EMAIL,
    )
    direction = PGEnumField(enum_type="CommunicationDirection", choices=CommunicationDirection.choices)
    subject = models.TextField(null=True, blank=True)
    body_text = models.TextField(db_column="bodyText", null=True, blank=True)
    body_html = models.TextField(db_column="bodyHtml", null=True, blank=True)
    external_thread_id = models.TextField(db_column="externalThreadId", null=True, blank=True)
    external_message_id = models.TextField(db_column="externalMessageId", null=True, blank=True)
    sent_at = TimestampField(db_column="sentAt", null=True, blank=True)
    received_at = TimestampField(db_column="receivedAt", null=True, blank=True)
    parsed_summary = models.TextField(db_column="parsedSummary", null=True, blank=True)
    needs_review = models.BooleanField(db_column="needsReview", default=True)
    created_at = TimestampField(db_column="createdAt", default=timezone.now)
    updated_at = TimestampField(db_column="updatedAt", auto_now=True)

    objects = CommunicationManager()

    class Meta:
        db_table = "Communication"
        ordering = ["created_at"]

    def __str__(self) -> str:
        return self.subject or f"{self.direction} {self.id}"
