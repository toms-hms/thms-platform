"""The job table."""

import uuid

from django.db import models
from django.utils import timezone

from contractors.models import TradeCategory
from jobs.models.job.manager import JobManager


class JobIntent(models.TextChoices):
    """What the homeowner is trying to achieve, which decides how the assistant scopes the work."""

    ISSUE = "ISSUE", "Issue"
    IMPROVEMENT = "IMPROVEMENT", "Improvement"
    RECURRING_WORK = "RECURRING_WORK", "Recurring work"


class JobStatus(models.TextChoices):
    """Where the job sits in its lifecycle. Only the user moves a job between states."""

    DRAFT = "DRAFT", "Draft"
    PLANNING = "PLANNING", "Planning"
    REACHING_OUT = "REACHING_OUT", "Reaching out"
    COMPARING_QUOTES = "COMPARING_QUOTES", "Comparing quotes"
    SCHEDULED = "SCHEDULED", "Scheduled"
    IN_PROGRESS = "IN_PROGRESS", "In progress"
    AWAITING_PAYMENT = "AWAITING_PAYMENT", "Awaiting payment"
    COMPLETED = "COMPLETED", "Completed"


class Job(models.Model):
    """A piece of work on a home."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    home = models.ForeignKey("homes.Home", on_delete=models.CASCADE, related_name="jobs")
    title = models.TextField()
    intent = models.CharField(max_length=32, choices=JobIntent.choices, default=JobIntent.ISSUE)
    category = models.CharField(max_length=32, choices=TradeCategory.choices)
    description = models.TextField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=32, choices=JobStatus.choices, default=JobStatus.DRAFT)
    ai_session = models.JSONField(null=True, blank=True)
    created_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT, related_name="created_jobs")
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    objects = JobManager()

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title
