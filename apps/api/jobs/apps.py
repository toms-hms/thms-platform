from django.apps import AppConfig


class JobsConfig(AppConfig):
    """Jobs and the contractors assigned to them."""

    name = "jobs"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self) -> None:
        """Registers this app's models with the audit log."""
        from auditlog.registry import auditlog

        from jobs.models import Job, JobContractor

        auditlog.register(Job, exclude_fields=["updated_at"])
        auditlog.register(JobContractor, exclude_fields=["updated_at"])
