"""The quote table."""

from django.db import models
from django.utils import timezone

from core.fields import CuidField, PGEnumField, TimestampField
from core.ids import create_id
from quotes.models.quote.manager import QuoteManager


class QuoteStatus(models.TextChoices):
    """Whether the quote is still provisional or has been confirmed by the homeowner."""

    DRAFT = "DRAFT", "Draft"
    CONFIRMED = "CONFIRMED", "Confirmed"


class Quote(models.Model):
    """A price a contractor has given for a job."""

    id = CuidField(default=create_id)
    job = models.ForeignKey("jobs.Job", on_delete=models.CASCADE, db_column="jobId", related_name="quotes")
    contractor = models.ForeignKey(
        "contractors.Contractor", on_delete=models.DO_NOTHING, db_column="contractorId", related_name="quotes"
    )
    amount = models.FloatField()
    description = models.TextField(null=True, blank=True)
    status = PGEnumField(enum_type="QuoteStatus", choices=QuoteStatus.choices, default=QuoteStatus.DRAFT)
    source_communication = models.OneToOneField(
        "communications.Communication",
        on_delete=models.DO_NOTHING,
        db_column="sourceCommunicationId",
        null=True,
        blank=True,
        related_name="quote",
    )
    created_at = TimestampField(db_column="createdAt", default=timezone.now)
    updated_at = TimestampField(db_column="updatedAt", auto_now=True)

    objects = QuoteManager()

    class Meta:
        db_table = "Quote"
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"{self.contractor_id}: {self.amount}"
