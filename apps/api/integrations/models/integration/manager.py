"""Filter compositions and writes for the integration table."""

from core.managers import BaseManager
from integrations.models.integration.queryset import IntegrationQuerySet


class IntegrationManager(BaseManager.from_queryset(IntegrationQuerySet)):
    """Lookups and upserts over a user's connected accounts."""

    def upsert_by_provider(self, *, user_id: str, provider: str, **fields):
        """Creates or replaces the user's connection for this provider."""
        integration, _ = self.update_or_create(user_id=user_id, defaults=fields, provider=provider)
        return integration
