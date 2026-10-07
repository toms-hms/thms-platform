"""Base model managers.

A manager is built from its app's queryset (`BaseManager.from_queryset(...)`),
so every queryset filter is also callable as `Model.objects.filter_*`. Managers
add what does not chain: compositions of several filters, writes, and methods
that return values rather than querysets. Managers make no access decisions —
see .ai/recipes/api/manager.md and .ai/recipes/api/permissioning.md.
"""

from django.db import models

from core.querysets import BaseQuerySet


class BaseManager(models.Manager.from_queryset(BaseQuerySet)):
    """Manager exposing the shared BaseQuerySet filters."""
