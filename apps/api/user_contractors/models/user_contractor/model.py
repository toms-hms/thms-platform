"""The user contractor table."""

from django.db import models

from core.models import BaseModel
from user_contractors.models.user_contractor.manager import UserContractorManager


class UserContractor(BaseModel):
    """A link between a user and a contractor they have saved."""

    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="rolodex_entries")
    contractor = models.ForeignKey(
        "contractors.Contractor",
        on_delete=models.CASCADE,
        related_name="rolodex_entries",
    )
    note = models.TextField(null=True, blank=True)

    objects = UserContractorManager()

    class Meta:
        ordering = ["-created_at"]
