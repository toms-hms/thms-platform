"""Query methods for connected third-party accounts."""

from django.db import models

from core.managers import BaseManager


class IntegrationManager(BaseManager):
    """Lookups and upserts over a user's connected accounts."""

    def list_for_user(self, user_id: str) -> models.QuerySet:
        """Returns every integration belonging to the user."""
        return self.filter(user_id=user_id)

    def find_by_user_and_provider(self, user_id: str, provider: str):
        """Returns the user's integration for this provider, or None."""
        return self.filter(user_id=user_id, provider=provider).first()

    def upsert_by_provider(self, user_id: str, provider: str, **fields):
        """Creates or replaces the user's connection for this provider."""
        integration, _ = self.update_or_create(user_id=user_id, provider=provider, defaults=fields)
        return integration
