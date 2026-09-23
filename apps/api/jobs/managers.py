"""Query methods for jobs and job/contractor assignments."""

from django.db import models
from django.utils import timezone

from core.errors import NotFoundError
from core.managers import PermissionedManager


class JobManager(PermissionedManager):
    """Visibility and lookups for jobs. A job is visible through membership of its home."""

    def has_permission(self, user_id: str, resource_id: str) -> bool:
        """Returns True when the user belongs to the home the job sits under."""
        from homes.models import Home

        job = self.filter(pk=resource_id).only("home_id").first()
        if not job:
            return False
        return Home.objects.has_permission(user_id, job.home_id)

    def list_for_user(self, user_id: str, role: str, **filters) -> models.QuerySet:
        """Returns jobs on the given home for a member; every matching job for an ADMIN."""
        from accounts.models import UserRole
        from homes.models import UserHome

        home_id = filters.get("home_id")
        queryset = self.all()
        if role != UserRole.ADMIN:
            if home_id and not UserHome.objects.filter(user_id=user_id, home_id=home_id).exists():
                raise NotFoundError("Home")
            queryset = queryset.filter(home__memberships__user_id=user_id)
        if home_id:
            queryset = queryset.filter(home_id=home_id)
        if filters.get("status"):
            queryset = queryset.filter(status=filters["status"])
        if filters.get("category"):
            queryset = queryset.filter(category=filters["category"])
        return queryset

    def find_by_id(self, job_id: str):
        """Returns the job with this id, or None."""
        return self.filter(pk=job_id).first()


class JobContractorManager(PermissionedManager):
    """Visibility and lookups for contractor assignments, which inherit the job's permissions."""

    def has_permission(self, user_id: str, resource_id: str) -> bool:
        """Returns True when the user may access the job this assignment belongs to."""
        from jobs.models import Job

        assignment = self.filter(pk=resource_id).only("job_id").first()
        if not assignment:
            return False
        return Job.objects.has_permission(user_id, assignment.job_id)

    def list_for_job(self, job_id: str) -> models.QuerySet:
        """Returns the contractor assignments for a job with contractors preloaded."""
        return self.filter(job_id=job_id).select_related("contractor")

    def list_for_user(self, user_id: str, role: str, **filters) -> models.QuerySet:
        """Returns the assignments for a job the user may see, raising NotFoundError otherwise."""
        from accounts.models import UserRole
        from jobs.models import Job

        job_id = filters.get("job_id")
        if role != UserRole.ADMIN and not Job.objects.has_permission(user_id, job_id):
            raise NotFoundError("Job")
        return self.list_for_job(job_id)

    def upsert(self, job_id: str, contractor_id: str, notes: str | None = None):
        """Assigns the contractor to the job, updating the notes when the assignment already exists."""
        assignment, _ = self.update_or_create(
            job_id=job_id, contractor_id=contractor_id, defaults={"notes": notes}
        )
        return assignment

    def update_status(self, assignment_id: str, status: str, notes: str | None = None):
        """Moves the assignment to the given status, stamping first contact and first response once each."""
        from jobs.models import CONTACTED_STATUSES, RESPONDED_STATUSES

        assignment = self.get_or_404(pk=assignment_id)
        now = timezone.now()
        assignment.status = status
        if notes is not None:
            assignment.notes = notes
        if status in CONTACTED_STATUSES and not assignment.last_contacted_at:
            assignment.last_contacted_at = now
        if status in RESPONDED_STATUSES and not assignment.last_response_at:
            assignment.last_response_at = now
        assignment.save()
        return assignment
