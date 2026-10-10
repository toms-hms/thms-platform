from django.apps import AppConfig


class QuotesConfig(AppConfig):
    """Contractor quotes against a job."""

    name = "quotes"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self) -> None:
        """Registers this app's models with the audit log."""
        from auditlog.registry import auditlog

        from quotes.models import Quote

        auditlog.register(Quote, exclude_fields=["updated_at"])
