from django.apps import AppConfig


class UserContractorsConfig(AppConfig):
    """A user's private contractor rolodex."""

    name = "user_contractors"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self) -> None:
        """Registers this app's models with the audit log."""
        from auditlog.registry import auditlog

        from user_contractors.models import UserContractor

        auditlog.register(UserContractor, exclude_fields=["updated_at"])
