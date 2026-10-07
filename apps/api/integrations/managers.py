"""Query compositions and upserts for connected third-party accounts."""

from core.managers import BaseManager
from integrations.querysets import IntegrationQuerySet


class IntegrationManager(BaseManager.from_queryset(IntegrationQuerySet)):
    """Lookups and upserts over a user's connected accounts."""

    def find_by_user_and_provider(self, user_id: str, provider: str):
        """Returns the user's integration for this provider, or None."""
        return self.filter(user_id=user_id).filter_providers([provider]).first()

    def upsert_by_provider(self, user_id: str, provider: str, **fields):
        """Creates or replaces the user's connection for this provider."""
        integration, _ = self.update_or_create(user_id=user_id, provider=provider, defaults=fields)
        return integration
