"""The home table."""

from django.db import models
from django.utils import timezone

from core.fields import CuidField, TimestampField
from core.ids import create_id
from homes.models.home.manager import HomeManager


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
