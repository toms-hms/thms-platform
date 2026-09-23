from django.apps import AppConfig


class HomesConfig(AppConfig):
    """Homes and their membership."""

    name = "homes"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self) -> None:
        """Registers this app's models with the audit log."""
        from auditlog.registry import auditlog

        from homes.models import Home, UserHome

        auditlog.register(Home, exclude_fields=["updated_at"])
        auditlog.register(UserHome)
