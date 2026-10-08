"""The user home table."""

import uuid

from django.db import models
from django.utils import timezone

from homes.models.user_home.manager import UserHomeManager


class HomeRole(models.TextChoices):
    """A user's role within a single home. Only OWNER may delete the home."""

    OWNER = "OWNER", "Owner"
    MEMBER = "MEMBER", "Member"


class UserHome(models.Model):
    """Membership of a user in a home. A user holds at most one membership per home."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="home_memberships")
    home = models.ForeignKey("homes.Home", on_delete=models.CASCADE, related_name="memberships")
    role = models.CharField(max_length=32, choices=HomeRole.choices, default=HomeRole.OWNER)
    created_at = models.DateTimeField(default=timezone.now)

    objects = UserHomeManager()

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "home"], name="userhome_user_home_unique")]

    def __str__(self) -> str:
        return f"{self.user_id}@{self.home_id}"
