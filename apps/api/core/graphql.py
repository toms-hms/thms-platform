"""Shared GraphQL plumbing: caller identity, auth decorators and error mapping.

Access is declared on the resolver, not decided inside managers:

- `@login_required` — any authenticated caller.
- `@admin_required` — platform ADMIN only.
- `@authorize(permission, resource=Model, arg="model_id")` — the caller holds the
  permission in the home the named row belongs to.
- `@owner_required(resource=Model, arg="model_id")` — the named row belongs to the caller.

See .ai/recipes/api/permissioning.md.
"""

import functools
from collections.abc import Callable
from typing import Any

from django.core.exceptions import ValidationError as DjangoValidationError
from graphql import GraphQLError

from core import permissions
from core.errors import AppError, ForbiddenError, UnauthorizedError


def current_user(info: Any):
    """Returns the authenticated user for the request, raising UnauthorizedError when there is none."""
    user = getattr(info.context, "user", None)
    if not user or not getattr(user, "is_authenticated", False):
        raise UnauthorizedError()
    return user


def login_required(resolver: Callable) -> Callable:
    """Wraps a resolver so it runs only for an authenticated caller."""

    @functools.wraps(resolver)
    def wrapper(root, info, **kwargs):
        current_user(info)
        return resolver(root, info, **kwargs)

    return wrapper


def admin_required(resolver: Callable) -> Callable:
    """Wraps a resolver so it runs only for a caller with the ADMIN role."""

    @functools.wraps(resolver)
    def wrapper(root, info, **kwargs):
        from accounts.models import UserRole

        user = current_user(info)
        if user.role != UserRole.ADMIN:
            raise ForbiddenError("Insufficient permissions")
        return resolver(root, info, **kwargs)

    return wrapper


def authorize(
    permission: permissions.Permission, *, resource: type, arg: str, optional: bool = False
) -> Callable[[Callable], Callable]:
    """Wraps a resolver so it runs only when the caller holds the permission in the row's home.

    `resource` is a model whose queryset is home-scoped; `arg` names the resolver
    argument carrying that row's id. A row that does not exist is FORBIDDEN, the
    same as one the caller cannot see. With `optional=True` an omitted argument
    skips the check — the resolver is then a collection and must scope its result
    with `visible_to`.
    """

    def decorator(resolver: Callable) -> Callable:
        @functools.wraps(resolver)
        def wrapper(root, info, **kwargs):
            user = current_user(info)
            resource_id = kwargs.get(arg)
            if resource_id is None and optional:
                return resolver(root, info, **kwargs)
            home_id = resource.objects.home_id_for(resource_id) if resource_id else None
            permissions.require(user, permission, home_id)
            return resolver(root, info, **kwargs)

        return wrapper

    return decorator


def owner_required(*, resource: type, arg: str) -> Callable[[Callable], Callable]:
    """Wraps a resolver so it runs only when the row named by `arg` belongs to the caller.

    `resource` is a model whose queryset is user-owned. A row that does not exist
    is FORBIDDEN, the same as someone else's.
    """

    def decorator(resolver: Callable) -> Callable:
        @functools.wraps(resolver)
        def wrapper(root, info, **kwargs):
            user = current_user(info)
            resource_id = kwargs.get(arg)
            if not resource_id or resource.objects.owner_id_for(resource_id) != user.pk:
                raise ForbiddenError()
            return resolver(root, info, **kwargs)

        return wrapper

    return decorator


def to_graphql_error(error: Exception) -> GraphQLError:
    """Returns a GraphQLError carrying the domain error's stable `extensions.code`."""
    if isinstance(error, AppError):
        return GraphQLError(error.message, extensions={"code": error.code})
    if isinstance(error, DjangoValidationError):
        # A malformed id (not a UUID) that reached a query unguarded.
        return GraphQLError("Invalid input", extensions={"code": "BAD_REQUEST"})
    return GraphQLError("An unexpected error occurred", extensions={"code": "INTERNAL_ERROR"})
