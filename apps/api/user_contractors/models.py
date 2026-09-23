"""A user's private contractor rolodex.

Unlike the rest of the schema this table is snake_cased throughout — it was
added later — so the column mapping here is one-to-one with the attribute names.
"""

from django.db import models
from django.utils import timezone

from core.fields import CuidField, TimestampField
from core.ids import create_id
from user_contractors.managers import UserContractorManager


class UserContractor(models.Model):
    """A link between a user and a contractor they have saved."""

    id = CuidField(default=create_id)
    user = models.ForeignKey(
        "accounts.User", on_delete=models.CASCADE, db_column="user_id", related_name="rolodex_entries"
    )
    contractor = models.ForeignKey(
        "contractors.Contractor",
        on_delete=models.CASCADE,
        db_column="contractor_id",
        related_name="rolodex_entries",
    )
    note = models.TextField(null=True, blank=True)
    created_at = TimestampField(db_column="created_at", default=timezone.now)
    updated_at = TimestampField(db_column="updated_at", auto_now=True)

    objects = UserContractorManager()

    class Meta:
        db_table = "user_contractors"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.user_id}->{self.contractor_id}"
