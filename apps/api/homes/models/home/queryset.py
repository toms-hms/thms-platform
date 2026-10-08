"""Chainable filters for the home table."""

from core.querysets import HomeScopedQuerySet


class HomeQuerySet(HomeScopedQuerySet):
    """Homes. A home is its own scope."""

    home_id_path = "id"
