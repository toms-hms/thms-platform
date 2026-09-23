from django.apps import AppConfig


class ContractorsConfig(AppConfig):
    """The global contractor directory."""

    name = "contractors"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self) -> None:
        """Registers this app's models with the audit log."""
        from auditlog.registry import auditlog

        from contractors.models import Contractor, ContractorZipCode

        auditlog.register(Contractor, exclude_fields=["updated_at"])
        auditlog.register(ContractorZipCode)
