"""Permission checks with a short-lived cache.

A positive check is cached for PERMISSION_CACHE_TIMEOUT seconds so repeated
object access inside a request (and across a page's queries) does not re-run the
membership lookup. Only positive results are cached — a denial must be re-checked
so that granting access takes effect immediately.

The cache is an optimisation, never the authority: if the cache backend is
unavailable the check falls through to the database rather than failing the
request.
"""

import logging
from typing import Any

from django.conf import settings
from django.core.cache import cache
from django.db import models

from core.errors import ForbiddenError
from core.managers import PermissionedManager

logger = logging.getLogger(__name__)


def _key(user_id: str, resource_id: str) -> str:
    """Returns the cache key for a single user/resource permission pair."""
    return f"perm:{user_id}:{resource_id}"


def _cache_get(key: str):
    """Returns the cached value, treating an unavailable cache as a miss."""
    try:
        return cache.get(key)
    except Exception:
        logger.warning("Permission cache unavailable on read; falling back to the database", exc_info=True)
        return None


def _cache_set(key: str, value: bool) -> None:
    """Writes to the cache, ignoring an unavailable backend."""
    try:
        cache.set(key, value, settings.PERMISSION_CACHE_TIMEOUT)
    except Exception:
        logger.warning("Permission cache unavailable on write", exc_info=True)


def _cache_delete(key: str) -> None:
    """Drops a cache entry, ignoring an unavailable backend."""
    try:
        cache.delete(key)
    except Exception:
        logger.warning("Permission cache unavailable on delete", exc_info=True)


def check(manager: PermissionedManager, user_id: str, resource_id: str) -> bool:
    """Returns True when the user may access the resource, consulting and warming the cache."""
    if not resource_id:
        return False
    cached = _cache_get(_key(user_id, resource_id))
    if cached is not None:
        return bool(cached)
    allowed = manager.has_permission(user_id, resource_id)
    if allowed:
        _cache_set(_key(user_id, resource_id), True)
    return allowed


def require(manager: PermissionedManager, user_id: str, resource_id: str) -> None:
    """Raises ForbiddenError unless the user may access the resource."""
    if not check(manager, user_id, resource_id):
        raise ForbiddenError()


def list_for_user(manager: PermissionedManager, user_id: str, role: str, **filters: Any) -> models.QuerySet:
    """Returns the rows visible to the user and warms the cache for each one."""
    results = manager.list_for_user(user_id, role, **filters)
    for item in results:
        if getattr(item, "pk", None):
            _cache_set(_key(user_id, item.pk), True)
    return results


def grant(user_id: str, resource_id: str) -> None:
    """Warms the cache for a resource the caller just created or was just given access to."""
    _cache_set(_key(user_id, resource_id), True)


def invalidate(user_id: str, resource_id: str) -> None:
    """Drops the cached permission so the next check re-reads the database."""
    _cache_delete(_key(user_id, resource_id))
