"""The job contractor table."""

from django.db import models
from django.utils import timezone

from core.fields import CuidField, PGEnumField, TimestampField
from core.ids import create_id
from jobs.models.job_contractor.manager import JobContractorManager


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


class JobContractor(models.Model):
    """A contractor's involvement in one job, and how far it has progressed."""

    id = CuidField(default=create_id)
    job = models.ForeignKey(
        "jobs.Job", on_delete=models.CASCADE, db_column="jobId", related_name="job_contractors"
    )
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
