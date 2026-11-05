"""The home table."""

from django.db import models

from core.models import BaseModel
from homes.models.home.manager import HomeManager


class Home(BaseModel):
    """A property whose maintenance jobs the platform tracks."""

    name = models.TextField()
    address1 = models.TextField()
    address2 = models.TextField(null=True, blank=True)
    city = models.TextField()
    state = models.TextField()
    zip_code = models.TextField()
    country = models.TextField(default="US")
    notes = models.TextField(null=True, blank=True)

    objects = HomeManager()

    class Meta:
        ordering = ["-created_at"]
