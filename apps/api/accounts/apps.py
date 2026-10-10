from django.apps import AppConfig


class AccountsConfig(AppConfig):
    """Users, credentials and JWT session handling."""

    name = "accounts"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self) -> None:
        """Registers this app's models with the audit log."""
        from auditlog.registry import auditlog

        from accounts.models import User

        # Credentials are audited as events, never as values.
        auditlog.register(User, exclude_fields=["password", "refresh_token_hash", "updated_at"])
