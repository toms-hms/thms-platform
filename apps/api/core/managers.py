"""Base model managers.

A manager is built from its app's queryset (`BaseManager.from_queryset(...)`),
so every queryset filter is also callable as `Model.objects.filter_*`. Managers
add what does not chain: compositions of several filters, generic writes, and
methods that return values rather than querysets. Managers hold no business
rules and make no access decisions — see .ai/recipes/api/manager.md.
"""

from typing import Any

from django.db import models

from core.errors import ValidationError
from core.querysets import BaseQuerySet
from core.utils.unset_utils import UNSET


class BaseManager(models.Manager.from_queryset(BaseQuerySet)):
    """Manager exposing the shared BaseQuerySet filters and the partial-update write."""

    def apply_updates(self, instance: models.Model, **fields: Any) -> models.Model:
        """Sets every field that is not UNSET and saves only those columns.

        None clears a nullable field and raises ValidationError on a required one.
        `auto_now` fields such as updated_at are saved alongside any change.
        """
        changed: list[str] = []
        for name, value in fields.items():
            if value is UNSET:
                continue
            field = instance._meta.get_field(name)
            if value is None and not field.null:
                raise ValidationError(f"{field.name} cannot be null")
            setattr(instance, field.attname, value)
            changed.append(field.attname)
        if changed:
            auto_now = [f.attname for f in instance._meta.concrete_fields if getattr(f, "auto_now", False)]
            instance.save(update_fields=[*changed, *auto_now])
        return instance
