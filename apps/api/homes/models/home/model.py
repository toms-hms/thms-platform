"""The home table."""

import uuid

from django.db import models
from django.utils import timezone

from core.models import BaseModel
from homes.models.home.manager import HomeManager


class Home(BaseModel):
    """A property whose maintenance jobs the platform tracks."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.TextField()
    address1 = models.TextField()
    address2 = models.TextField(null=True, blank=True)
    city = models.TextField()
    state = models.TextField()
    zip_code = models.TextField()
    country = models.TextField(default="US")
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    objects = HomeManager()

    class Meta:
        ordering = ["-created_at"]
