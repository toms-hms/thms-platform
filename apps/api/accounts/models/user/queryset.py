"""Chainable filters for the user table."""

from core.querysets import BaseQuerySet


class UserQuerySet(BaseQuerySet):
    """User rows. Add filter_* methods here as callers need them."""
