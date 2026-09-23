"""Shared GraphQL plumbing: caller identity, auth decorators and error mapping."""

import functools
from collections.abc import Callable
from typing import Any

from graphql import GraphQLError

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


def to_graphql_error(error: Exception) -> GraphQLError:
    """Returns a GraphQLError carrying the domain error's stable `extensions.code`."""
    if isinstance(error, AppError):
        return GraphQLError(error.message, extensions={"code": error.code})
    return GraphQLError("An unexpected error occurred", extensions={"code": "INTERNAL_ERROR"})
