"""Access policy: named permissions, what each home role grants, and the one decision function.

A user reaches home-scoped data through their membership of the home. The
membership's role maps to a set of permissions; `can()` is the only place that
turns (user, permission, home) into yes or no, and ADMIN is allowed everything
here, explicitly. Resolvers declare what they need with `@authorize` (see
core.graphql); collections are scoped with `visible_to` (see core.querysets).

A member's role is cached for PERMISSION_CACHE_TIMEOUT seconds per (user, home).
Only memberships are cached — a non-member is re-checked every time, so adding
someone takes effect immediately. Services call `invalidate()` whenever a
membership changes or is removed. The cache is an optimisation, never the
authority: an unavailable backend falls through to the database.
"""

import logging
from enum import StrEnum

from django.conf import settings
from django.core.cache import cache
from django.db import models

from core.errors import ForbiddenError

logger = logging.getLogger(__name__)


class Permission(StrEnum):
    """Something a member may do inside a home. Resolvers name one of these in `@authorize`."""

    HOME_VIEW = "home.view"
    HOME_EDIT = "home.edit"
    HOME_DELETE = "home.delete"
    HOME_MANAGE_MEMBERS = "home.manage_members"
    JOBS_VIEW = "jobs.view"
    JOBS_EDIT = "jobs.edit"
    QUOTES_VIEW = "quotes.view"
    QUOTES_EDIT = "quotes.edit"
    COMMUNICATIONS_VIEW = "communications.view"
    COMMUNICATIONS_EDIT = "communications.edit"


class PermissionService:
    """Decides whether a user holds a permission in a home, caching each member's role."""

    def role_permissions(self, role: str) -> frozenset[Permission]:
        """Returns the permissions a home role grants. OWNER holds every permission."""
        from homes.models import HomeRole

        if role == HomeRole.OWNER:
            return frozenset(Permission)
        if role == HomeRole.MEMBER:
            return frozenset(Permission) - {Permission.HOME_DELETE}
        return frozenset()

    def roles_with(self, permission: Permission) -> list[str]:
        """Returns the home roles that grant the permission."""
        from homes.models import HomeRole

        return [role for role in HomeRole if permission in self.role_permissions(role)]

    def _key(self, user_id: str, home_id: str) -> str:
        """Returns the cache key for a user's role in a home."""
        return f"home-role:{user_id}:{home_id}"

    def _cache_get(self, key: str):
        """Returns the cached value, treating an unavailable cache as a miss."""
        try:
            return cache.get(key)
        except Exception:
            logger.warning(
                "Permission cache unavailable on read; falling back to the database", exc_info=True
            )
            return None

    def _cache_set(self, key: str, value: str) -> None:
        """Writes to the cache, ignoring an unavailable backend."""
        try:
            cache.set(key, value, settings.PERMISSION_CACHE_TIMEOUT)
        except Exception:
            logger.warning("Permission cache unavailable on write", exc_info=True)

    def _cache_delete(self, key: str) -> None:
        """Drops a cache entry, ignoring an unavailable backend."""
        try:
            cache.delete(key)
        except Exception:
            logger.warning("Permission cache unavailable on delete", exc_info=True)

    def membership_role(self, *, user_id: str, home_id: str) -> str | None:
        """Returns the user's role in the home, or None when they are not a member. Consults the cache."""
        from homes.models import UserHome

        cached = self._cache_get(self._key(user_id, home_id))
        if cached is not None:
            return cached
        role = (
            UserHome.objects.filter(user_id=user_id, home_id=home_id).values_list("role", flat=True).first()
        )
        if role is not None:
            self._cache_set(self._key(user_id, home_id), role)
        return role

    def can(self, user, permission: Permission, home_id: str | None) -> bool:
        """Returns True when the user holds the permission in the home. ADMIN holds every permission."""
        if not home_id:
            return False
        if user.is_admin:
            return True
        role = self.membership_role(user_id=user.pk, home_id=home_id)
        return role is not None and permission in self.role_permissions(role)

    def require(self, user, permission: Permission, home_id: str | None) -> None:
        """Raises ForbiddenError unless the user holds the permission in the home."""
        if not self.can(user, permission, home_id):
            raise ForbiddenError()

    def home_ids_with(self, user, permission: Permission) -> models.QuerySet:
        """Returns a subquery of the ids of homes where the user holds the permission."""
        from homes.models import UserHome

        return UserHome.objects.filter(user_id=user.pk, role__in=self.roles_with(permission)).values(
            "home_id"
        )

    def invalidate(self, *, user_id: str, home_id: str) -> None:
        """Drops the user's cached role in the home so the next check re-reads the database."""
        self._cache_delete(self._key(user_id, home_id))
