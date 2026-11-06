from django.apps import AppConfig


class IntegrationsConfig(AppConfig):
    """Connected third-party accounts (email, AI providers)."""

    name = "integrations"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self) -> None:
        """Registers this app's models with the audit log."""
        from auditlog.registry import auditlog

        from integrations.models import Integration

        # Encrypted tokens are excluded — the log records that a connection
        # changed, never the secret itself.
        auditlog.register(Integration, exclude_fields=["access_token_enc", "refresh_token_enc", "updated_at"])
