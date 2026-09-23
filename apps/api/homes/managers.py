"""Query methods for homes and home membership."""

from django.db import models

from core.errors import NotFoundError
from core.managers import BaseManager, PermissionedManager


class HomeManager(PermissionedManager):
    """Visibility and lookups for homes. A user sees a home only through membership."""

    def has_permission(self, user_id: str, resource_id: str) -> bool:
        """Returns True when the user is a member of the home. Pure data check — no role logic."""
        from homes.models import UserHome

        return UserHome.objects.filter(user_id=user_id, home_id=resource_id).exists()

    def list_for_user(self, user_id: str, role: str, **filters) -> models.QuerySet:
        """Returns the homes the user belongs to; every home for an ADMIN."""
        from accounts.models import UserRole

        if role == UserRole.ADMIN:
            return self.all()
        return self.filter(memberships__user_id=user_id)

    def find_by_id(self, home_id: str):
        """Returns the home with this id, or None."""
        return self.filter(pk=home_id).first()


class UserHomeManager(BaseManager):
    """Lookups over the user/home join."""

    def find_membership(self, user_id: str, home_id: str):
        """Returns the user's membership row for the home, or None."""
        return self.filter(user_id=user_id, home_id=home_id).first()

    def assert_membership(self, user_id: str, home_id: str):
        """Returns the membership row, raising NotFoundError when the user is not a member."""
        membership = self.find_membership(user_id, home_id)
        if not membership:
            raise NotFoundError("Home")
        return membership

    def list_members_for_home(self, home_id: str) -> models.QuerySet:
        """Returns every membership row for the home with its user preloaded."""
        return self.filter(home_id=home_id).select_related("user")

    def upsert(self, user_id: str, home_id: str, role: str):
        """Creates the membership, or updates the role when one already exists."""
        membership, _ = self.update_or_create(user_id=user_id, home_id=home_id, defaults={"role": role})
        return membership
