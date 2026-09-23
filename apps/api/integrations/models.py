"""Third-party accounts a user has connected.

OAuth tokens are encrypted at rest with AES-256-GCM (core.crypto) and are never
returned to clients — only the connection's metadata is exposed.
"""

from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.utils import timezone

from core.fields import CuidField, PGEnumField, TimestampField
from core.ids import create_id
from integrations.managers import IntegrationManager


class IntegrationType(models.TextChoices):
    """What the connected account is used for."""

    EMAIL = "EMAIL", "Email"
    AI = "AI", "AI"


class IntegrationProvider(models.TextChoices):
    """Which third party the account belongs to."""

    GOOGLE = "GOOGLE", "Google"
    MICROSOFT = "MICROSOFT", "Microsoft"
    OPENAI = "OPENAI", "OpenAI"


class Integration(models.Model):
    """A connected third-party account belonging to one user."""

    id = CuidField(default=create_id)
    user = models.ForeignKey(
        "accounts.User", on_delete=models.CASCADE, db_column="userId", related_name="integrations"
    )
    type = PGEnumField(enum_type="IntegrationType", choices=IntegrationType.choices)
    provider = PGEnumField(enum_type="IntegrationProvider", choices=IntegrationProvider.choices)
    access_token_enc = models.TextField(db_column="accessTokenEnc")
    refresh_token_enc = models.TextField(db_column="refreshTokenEnc", null=True, blank=True)
    token_expires_at = TimestampField(db_column="tokenExpiresAt", null=True, blank=True)
    email = models.TextField(null=True, blank=True)
    scopes = ArrayField(models.TextField(), default=list)
    created_at = TimestampField(db_column="createdAt", default=timezone.now)
    updated_at = TimestampField(db_column="updatedAt", auto_now=True)

    objects = IntegrationManager()

    class Meta:
        db_table = "Integration"
        constraints = [
            models.UniqueConstraint(fields=["user", "provider"], name="Integration_userId_provider_key")
        ]

    def __str__(self) -> str:
        return f"{self.provider}:{self.email or self.user_id}"
