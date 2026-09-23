"""Query methods for quotes."""

from django.db import models

from core.errors import NotFoundError
from core.managers import PermissionedManager


class QuoteManager(PermissionedManager):
    """Visibility and lookups for quotes, which inherit the permissions of their job."""

    def has_permission(self, user_id: str, resource_id: str) -> bool:
        """Returns True when the user may access the job this quote belongs to."""
        from jobs.models import Job

        quote = self.filter(pk=resource_id).only("job_id").first()
        if not quote:
            return False
        return Job.objects.has_permission(user_id, quote.job_id)

    def list_for_job(self, job_id: str) -> models.QuerySet:
        """Returns the quotes on a job with contractors preloaded."""
        return self.filter(job_id=job_id).select_related("contractor")

    def list_for_user(self, user_id: str, role: str, **filters) -> models.QuerySet:
        """Returns the quotes for a job the user may see, raising NotFoundError otherwise."""
        from accounts.models import UserRole
        from jobs.models import Job

        job_id = filters.get("job_id")
        if role != UserRole.ADMIN and not Job.objects.has_permission(user_id, job_id):
            raise NotFoundError("Job")
        return self.list_for_job(job_id)
