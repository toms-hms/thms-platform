"""The job table."""

from django.db import models
from django.utils import timezone

from contractors.models import TradeCategory
from core.fields import CuidField, PGEnumField, TimestampField
from core.ids import create_id
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

    id = CuidField(default=create_id)
    home = models.ForeignKey("homes.Home", on_delete=models.CASCADE, db_column="homeId", related_name="jobs")
    title = models.TextField()
    intent = PGEnumField(enum_type="JobIntent", choices=JobIntent.choices, default=JobIntent.ISSUE)
    category = PGEnumField(enum_type="TradeCategory", choices=TradeCategory.choices)
    description = models.TextField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    status = PGEnumField(enum_type="JobStatus", choices=JobStatus.choices, default=JobStatus.DRAFT)
    ai_session = models.JSONField(db_column="ai_session", null=True, blank=True)
    created_by = models.ForeignKey(
        "accounts.User", on_delete=models.DO_NOTHING, db_column="createdByUserId", related_name="created_jobs"
    )
    created_at = TimestampField(db_column="createdAt", default=timezone.now)
    updated_at = TimestampField(db_column="updatedAt", auto_now=True)

    objects = JobManager()

    class Meta:
        db_table = "Job"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title
