"""Filter compositions and writes for the user home table."""

from core.managers import BaseManager
from homes.models.user_home.queryset import UserHomeQuerySet


class UserHomeManager(BaseManager.from_queryset(UserHomeQuerySet)):
    """Lookups and writes over the user/home join."""

    def upsert(self, *, home_id: str, user_id: str, role: str):
        """Creates the membership, or updates the role when one already exists."""
        membership, _ = self.update_or_create(home_id=home_id, user_id=user_id, defaults={"role": role})
        return membership

    def remove(self, *, home_id: str, user_id: str) -> None:
        """Deletes the user's membership of the home, if there is one."""
        self.filter_home_ids([home_id]).filter_user_ids([user_id]).delete()

    def member_ids(self, *, home_id: str) -> list[str]:
        """Returns the ids of every member of the home."""
        return list(self.filter_home_ids([home_id]).values_list("user_id", flat=True))

    def role_for(self, *, home_id: str, user_id: str) -> str | None:
        """Returns the user's role in the home, or None when they are not a member."""
        return (
            self.filter_home_ids([home_id]).filter_user_ids([user_id]).values_list("role", flat=True).first()
        )

    def home_ids_with_roles(self, *, user_id: str, roles: list[str]):
        """Returns a subquery of the ids of homes where the user holds one of the roles."""
        return self.filter(role__in=roles).filter_user_ids([user_id]).values("home_id")
