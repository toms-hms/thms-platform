"""The abstract base every model extends.

Its only job is a uniform `__str__`. django-auditlog stores `str(instance)` in
every log entry's `object_repr`, and Django puts it in logs and error messages,
so it must never carry personal or free-text data: just the model and its id.
"""

from django.db import models


class BaseModel(models.Model):
    """Abstract base for every model. Adds no fields, so it changes no table."""

    class Meta:
        abstract = True

    def __str__(self) -> str:
        return f"{type(self).__name__} - {self.pk}"
