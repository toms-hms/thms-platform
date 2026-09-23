"""Query methods for communications."""

from django.db import models

from core.errors import NotFoundError
from core.managers import PermissionedManager


class CommunicationManager(PermissionedManager):
    """Visibility and lookups for messages, which inherit the permissions of their job."""

    def has_permission(self, user_id: str, resource_id: str) -> bool:
        """Returns True when the message belongs to a job the user may access."""
        from jobs.models import Job

        communication = self.filter(pk=resource_id).only("job_id").first()
        if not communication or not communication.job_id:
            return False
        return Job.objects.has_permission(user_id, communication.job_id)

    def list_for_job(
        self,
        job_id: str,
        *,
        contractor_id: str | None = None,
        needs_review: bool | None = None,
        direction: str | None = None,
    ) -> models.QuerySet:
        """Returns the messages on a job, narrowed by any supplied filter."""
        queryset = self.filter(job_id=job_id).select_related("contractor")
        if contractor_id:
            queryset = queryset.filter(contractor_id=contractor_id)
        if needs_review is not None:
            queryset = queryset.filter(needs_review=needs_review)
        if direction:
            queryset = queryset.filter(direction=direction)
        return queryset

    def list_for_user(self, user_id: str, role: str, **filters) -> models.QuerySet:
        """Returns the messages for a job the user may see, raising NotFoundError otherwise."""
        from accounts.models import UserRole
        from jobs.models import Job

        job_id = filters.pop("job_id", None)
        if role != UserRole.ADMIN and not Job.objects.has_permission(user_id, job_id):
            raise NotFoundError("Job")
        return self.list_for_job(job_id, **filters)
