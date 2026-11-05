"""The abstract base every model extends.

It supplies the three columns every table has, so models declare only their own fields:
a UUID primary key, `created_at` and `updated_at`. It also gives a uniform `__str__`.
django-auditlog stores `str(instance)` in every log entry's `object_repr`, and Django puts it
in logs and error messages, so it must never carry personal or free-text data: just the model
and its id.
"""

import uuid

from django.db import models
from django.utils import timezone


class BaseModel(models.Model):
    """Abstract base for every model: UUID `id`, `created_at`, `updated_at`."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

    def __str__(self) -> str:
        return f"{type(self).__name__} - {self.pk}"
