"""Filter compositions and writes for the user home table."""

from core.managers import BaseManager
from homes.models.user_home.queryset import UserHomeQuerySet


class UserHomeManager(BaseManager.from_queryset(UserHomeQuerySet)):
    """Lookups and writes over the user/home join."""

    def upsert(self, *, user_id: str, home_id: str, role: str):
        """Creates the membership, or updates the role when one already exists."""
        membership, _ = self.update_or_create(user_id=user_id, home_id=home_id, defaults={"role": role})
        return membership
