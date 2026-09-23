"""Homes and the users who belong to them."""

from django.db import models
from django.utils import timezone

from core.fields import CuidField, PGEnumField, TimestampField
from core.ids import create_id
from homes.managers import HomeManager, UserHomeManager


class HomeRole(models.TextChoices):
    """A user's role within a single home. Only OWNER may delete the home."""

    OWNER = "OWNER", "Owner"
    MEMBER = "MEMBER", "Member"


class Home(models.Model):
    """A property whose maintenance jobs the platform tracks."""

    id = CuidField(default=create_id)
    name = models.TextField()
    address1 = models.TextField()
    address2 = models.TextField(null=True, blank=True)
    city = models.TextField()
    state = models.TextField()
    zip_code = models.TextField(db_column="zipCode")
    country = models.TextField(default="US")
    notes = models.TextField(null=True, blank=True)
    created_at = TimestampField(db_column="createdAt", default=timezone.now)
    updated_at = TimestampField(db_column="updatedAt", auto_now=True)

    objects = HomeManager()

    class Meta:
        db_table = "Home"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.name

    @property
    def full_address(self) -> str:
        """Returns the home's address as a single display line."""
        parts = [p for p in (self.address1, self.address2) if p]
        return f"{', '.join(parts)}, {self.city}, {self.state} {self.zip_code}"


class UserHome(models.Model):
    """Membership of a user in a home. The primary key is the (user, home) pair."""

    pk = models.CompositePrimaryKey("user_id", "home_id")
    user = models.ForeignKey(
        "accounts.User", on_delete=models.CASCADE, db_column="userId", related_name="home_memberships"
    )
    home = models.ForeignKey(Home, on_delete=models.CASCADE, db_column="homeId", related_name="memberships")
    role = PGEnumField(enum_type="HomeRole", choices=HomeRole.choices, default=HomeRole.OWNER)
    created_at = TimestampField(db_column="createdAt", default=timezone.now)

    objects = UserHomeManager()

    class Meta:
        db_table = "UserHome"

    def __str__(self) -> str:
        return f"{self.user_id}@{self.home_id}"
