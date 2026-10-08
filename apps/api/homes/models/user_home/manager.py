"""Filter compositions and writes for the user home table."""

from core.errors import NotFoundError
from core.managers import BaseManager
from homes.models.user_home.queryset import UserHomeQuerySet


class UserHomeManager(BaseManager.from_queryset(UserHomeQuerySet)):
    """Lookups and writes over the user/home join."""

    def find_membership(self, user_id: str, home_id: str):
        """Returns the user's membership row for the home, or None."""
        return self.filter_user_ids([user_id]).filter_home_ids([home_id]).first()

    def assert_membership(self, user_id: str, home_id: str):
        """Returns the membership row, raising NotFoundError when the user is not a member."""
        membership = self.find_membership(user_id, home_id)
        if not membership:
            raise NotFoundError("Home")
        return membership

    def list_members_for_home(self, home_id: str):
        """Returns every membership row for the home with its user preloaded."""
        return self.filter_home_ids([home_id]).select_related("user")

    def upsert(self, user_id: str, home_id: str, role: str):
        """Creates the membership, or updates the role when one already exists."""
        membership, _ = self.update_or_create(user_id=user_id, home_id=home_id, defaults={"role": role})
        return membership
