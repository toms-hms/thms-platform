"""Query methods for the user's contractor rolodex."""

from django.db import models

from core.managers import PermissionedManager


class UserContractorManager(PermissionedManager):
    """Visibility and lookups for rolodex entries. An entry is visible only to its owner."""

    def has_permission(self, user_id: str, resource_id: str) -> bool:
        """Returns True when the rolodex entry belongs to the user."""
        return self.filter(pk=resource_id, user_id=user_id).exists()

    def list_for_user(self, user_id: str, role: str, **filters) -> models.QuerySet:
        """Returns the user's rolodex entries; every entry for an ADMIN."""
        from accounts.models import UserRole

        queryset = self.select_related("contractor")
        return queryset if role == UserRole.ADMIN else queryset.filter(user_id=user_id)

    def filter_existing(self, user_id: str, contractor_id: str):
        """Returns the user's existing entry for this contractor, or None."""
        return self.filter(user_id=user_id, contractor_id=contractor_id).first()
