from django.apps import AppConfig


class AiConfig(AppConfig):
    """AI generations, job images and the diagnostic assistant."""

    name = "ai"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self) -> None:
        """Registers this app's models with the audit log."""
        from auditlog.registry import auditlog

        from ai.models import AIGeneration, JobImage

        auditlog.register(AIGeneration, exclude_fields=["updated_at"])
        auditlog.register(JobImage)
