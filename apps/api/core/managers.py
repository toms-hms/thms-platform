"""Base model managers.

Every manager guarding user-visible rows implements the permissioning contract:
`has_permission(user_id, resource_id)` is a pure data check with no role logic,
and `list_for_user(user_id, role)` is the visibility predicate list queries use.
See .ai/recipes/api/permissioning.md.
"""

from typing import Any

from django.db import models

from core.errors import NotFoundError


class BaseManager(models.Manager):
    """Manager providing the shared single-record lookup used across the domain."""

    def get_or_404(self, **kwargs: Any):
        """Returns the single record matching the filters, raising NotFoundError when absent."""
        try:
            return self.get(**kwargs)
        except self.model.DoesNotExist as err:
            raise NotFoundError(self.model.__name__) from err


class PermissionedManager(BaseManager):
    """Manager for models whose rows are visible only to permitted users."""

    def has_permission(self, user_id: str, resource_id: str) -> bool:
        """Returns True when the user may access the resource. Pure data check — no role logic."""
        raise NotImplementedError

    def list_for_user(self, user_id: str, role: str, **filters: Any) -> models.QuerySet:
        """Returns the rows visible to the user; ADMIN sees every row."""
        raise NotImplementedError
