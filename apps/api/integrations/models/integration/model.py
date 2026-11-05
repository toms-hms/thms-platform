"""The integration table."""

from django.contrib.postgres.fields import ArrayField
from django.db import models

from core.models import BaseModel
from integrations.models.integration.manager import IntegrationManager


class IntegrationType(models.TextChoices):
    """What the connected account is used for."""

    EMAIL = "EMAIL", "Email"
    AI = "AI", "AI"


class IntegrationProvider(models.TextChoices):
    """Which third party the account belongs to."""

    GOOGLE = "GOOGLE", "Google"
    MICROSOFT = "MICROSOFT", "Microsoft"
    OPENAI = "OPENAI", "OpenAI"


class Integration(BaseModel):
    """A connected third-party account belonging to one user."""

    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="integrations")
    type = models.CharField(max_length=32, choices=IntegrationType.choices)
    provider = models.CharField(max_length=32, choices=IntegrationProvider.choices)
    access_token_enc = models.TextField()
    refresh_token_enc = models.TextField(null=True, blank=True)
    token_expires_at = models.DateTimeField(null=True, blank=True)
    email = models.TextField(null=True, blank=True)
    scopes = ArrayField(models.TextField(), default=list)

    objects = IntegrationManager()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "provider"], name="integration_user_provider_unique")
        ]
