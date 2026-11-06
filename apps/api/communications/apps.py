from django.apps import AppConfig


class CommunicationsConfig(AppConfig):
    """Email sent to and received from contractors."""

    name = "communications"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self) -> None:
        """Registers this app's models with the audit log."""
        from auditlog.registry import auditlog

        from communications.models import Communication

        auditlog.register(Communication, exclude_fields=["updated_at"])
