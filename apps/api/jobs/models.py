"""Jobs and the contractors assigned to them.

A job is one piece of work on a home. `ai_session` holds the diagnostic Q&A
transcript and the contractor-ready brief the assistant produced from it.
"""

from django.db import models
from django.utils import timezone

from contractors.models import TradeCategory
from core.fields import CuidField, PGEnumField, TimestampField
from core.ids import create_id
from jobs.managers import JobContractorManager, JobManager


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


class JobContractorStatus(models.TextChoices):
    """Where a single contractor stands on a job."""

    NOT_CONTACTED = "NOT_CONTACTED", "Not contacted"
    CONTACTED = "CONTACTED", "Contacted"
    RESPONDED = "RESPONDED", "Responded"
    VISIT_REQUESTED = "VISIT_REQUESTED", "Visit requested"
    VISIT_SCHEDULED = "VISIT_SCHEDULED", "Visit scheduled"
    VISIT_COMPLETED = "VISIT_COMPLETED", "Visit completed"
    QUOTE_RECEIVED = "QUOTE_RECEIVED", "Quote received"
    DECLINED = "DECLINED", "Declined"
    ACCEPTED = "ACCEPTED", "Accepted"
    WORK_IN_PROGRESS = "WORK_IN_PROGRESS", "Work in progress"
    WORK_COMPLETED = "WORK_COMPLETED", "Work completed"
    PAID = "PAID", "Paid"


# Reaching these statuses implies first contact, and a response, respectively.
CONTACTED_STATUSES = frozenset(
    {
        JobContractorStatus.CONTACTED,
        JobContractorStatus.RESPONDED,
        JobContractorStatus.VISIT_REQUESTED,
        JobContractorStatus.VISIT_SCHEDULED,
        JobContractorStatus.VISIT_COMPLETED,
        JobContractorStatus.QUOTE_RECEIVED,
        JobContractorStatus.ACCEPTED,
        JobContractorStatus.WORK_IN_PROGRESS,
        JobContractorStatus.WORK_COMPLETED,
        JobContractorStatus.PAID,
    }
)
RESPONDED_STATUSES = CONTACTED_STATUSES - {JobContractorStatus.CONTACTED}


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


class JobContractor(models.Model):
    """A contractor's involvement in one job, and how far it has progressed."""

    id = CuidField(default=create_id)
    job = models.ForeignKey(Job, on_delete=models.CASCADE, db_column="jobId", related_name="job_contractors")
    contractor = models.ForeignKey(
        "contractors.Contractor",
        on_delete=models.CASCADE,
        db_column="contractorId",
        related_name="job_contractors",
    )
    status = PGEnumField(
        enum_type="JobContractorStatus",
        choices=JobContractorStatus.choices,
        default=JobContractorStatus.NOT_CONTACTED,
    )
    last_contacted_at = TimestampField(db_column="lastContactedAt", null=True, blank=True)
    last_response_at = TimestampField(db_column="lastResponseAt", null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    created_at = TimestampField(db_column="createdAt", default=timezone.now)
    updated_at = TimestampField(db_column="updatedAt", auto_now=True)

    objects = JobContractorManager()

    class Meta:
        db_table = "JobContractor"
        ordering = ["created_at"]
        constraints = [
            models.UniqueConstraint(fields=["job", "contractor"], name="JobContractor_jobId_contractorId_key")
        ]

    def __str__(self) -> str:
        return f"{self.job_id}:{self.contractor_id}"
