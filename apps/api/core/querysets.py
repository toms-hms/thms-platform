"""Base querysets: the chainable filter layer every app's querysets build on.

A queryset method narrows rows one clause at a time and returns the queryset, so
filters compose: `Contractor.objects.filter_ids(ids).filter_zip_codes(zips)`.
`None` means a filter is absent and returns the queryset unchanged; an empty
list is a filter nothing satisfies. See .ai/recipes/api/queryset.md.

Visibility predicates live here too — they are data filters. Which roles grant
which permission is policy, and lives in core.services.permission_service.
"""

from typing import Any, ClassVar, Self

from django.core.exceptions import ValidationError
from django.db import models

from core.errors import NotFoundError
from core.services.permission_service import Permission, PermissionService


class BaseQuerySet(models.QuerySet):
    """Filters shared by every model."""

    def filter_ids(self, ids: list[str] | None) -> Self:
        """Returns rows whose primary key is in ids."""
        if ids is None:
            return self
        return self.filter(pk__in=ids)

    def get_or_404(self, **kwargs: Any):
        """Returns the single row matching the filters, raising NotFoundError when absent."""
        try:
            return self.get(**kwargs)
        except (self.model.DoesNotExist, ValidationError) as err:
            raise NotFoundError(self.model.__name__) from err


class HomeScopedQuerySet(BaseQuerySet):
    """Rows whose access is decided by membership of the home they belong to.

    Subclasses set `home_id_path` to the lookup from the row to its home's id:
    `"id"` for Home itself, `"home_id"` for Job, `"job__home_id"` for Quote.
    """

    home_id_path: ClassVar[str]

    def filter_home_ids(self, home_ids: list[str] | None) -> Self:
        """Returns rows belonging to any of the given homes."""
        if home_ids is None:
            return self
        return self.filter(**{f"{self.home_id_path}__in": home_ids})

    def home_id_for(self, pk: str) -> str | None:
        """Returns the id of the home the row belongs to, or None when the row does not exist.

        A malformed id is treated as a row that does not exist.
        """
        try:
            return self.filter(pk=pk).values_list(self.home_id_path, flat=True).first()
        except ValidationError:
            return None

    def visible_to(self, user, permission: Permission) -> Self:
        """Returns rows in homes where the user holds the permission; every row for an ADMIN."""
        if user.is_admin:
            return self
        return self.filter(
            **{f"{self.home_id_path}__in": PermissionService().home_ids_with(user, permission)}
        )


class UserOwnedQuerySet(BaseQuerySet):
    """Rows that belong to a single user and are visible only to them."""

    owner_id_path: ClassVar[str] = "user_id"

    def owner_id_for(self, pk: str) -> str | None:
        """Returns the id of the user who owns the row, or None when the row does not exist or is malformed."""
        try:
            return self.filter(pk=pk).values_list(self.owner_id_path, flat=True).first()
        except ValidationError:
            return None

    def owned_by(self, user) -> Self:
        """Returns the user's own rows."""
        return self.filter(**{self.owner_id_path: user.pk})
