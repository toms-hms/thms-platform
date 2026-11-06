"""The quote table."""

from django.db import models

from core.models import BaseModel
from quotes.models.quote.manager import QuoteManager


class QuoteStatus(models.TextChoices):
    """Whether the quote is still provisional or has been confirmed by the homeowner."""

    DRAFT = "DRAFT", "Draft"
    CONFIRMED = "CONFIRMED", "Confirmed"


class Quote(BaseModel):
    """A price a contractor has given for a job."""

    job = models.ForeignKey("jobs.Job", on_delete=models.CASCADE, related_name="quotes")
    contractor = models.ForeignKey("contractors.Contractor", on_delete=models.PROTECT, related_name="quotes")
    amount = models.FloatField()
    description = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=32, choices=QuoteStatus.choices, default=QuoteStatus.DRAFT)
    source_communication = models.OneToOneField(
        "communications.Communication",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="quote",
    )

    objects = QuoteManager()

    class Meta:
        ordering = ["created_at"]
