"""The user contractor table."""

import uuid

from django.db import models
from django.utils import timezone

from user_contractors.models.user_contractor.manager import UserContractorManager


class UserContractor(models.Model):
    """A link between a user and a contractor they have saved."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="rolodex_entries")
    contractor = models.ForeignKey(
        "contractors.Contractor",
        on_delete=models.CASCADE,
        related_name="rolodex_entries",
    )
    note = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserContractorManager()

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.user_id}->{self.contractor_id}"
