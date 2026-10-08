"""The user home table."""

from django.db import models
from django.utils import timezone

from core.fields import PGEnumField, TimestampField
from homes.models.user_home.manager import UserHomeManager


class HomeRole(models.TextChoices):
    """A user's role within a single home. Only OWNER may delete the home."""

    OWNER = "OWNER", "Owner"
    MEMBER = "MEMBER", "Member"


class UserHome(models.Model):
    """Membership of a user in a home. The primary key is the (user, home) pair."""

    pk = models.CompositePrimaryKey("user_id", "home_id")
    user = models.ForeignKey(
        "accounts.User", on_delete=models.CASCADE, db_column="userId", related_name="home_memberships"
    )
    home = models.ForeignKey(
        "homes.Home", on_delete=models.CASCADE, db_column="homeId", related_name="memberships"
    )
    role = PGEnumField(enum_type="HomeRole", choices=HomeRole.choices, default=HomeRole.OWNER)
    created_at = TimestampField(db_column="createdAt", default=timezone.now)

    objects = UserHomeManager()

    class Meta:
        db_table = "UserHome"

    def __str__(self) -> str:
        return f"{self.user_id}@{self.home_id}"
