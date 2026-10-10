"""Chainable filters for the user home table."""

from typing import Self

from core.querysets import HomeScopedQuerySet


class UserHomeQuerySet(HomeScopedQuerySet):
    """Membership rows, scoped by the home they grant access to."""

    home_id_path = "home_id"

    def filter_user_ids(self, user_ids: list[str] | None) -> Self:
        """Returns memberships held by any of the given users."""
        if user_ids is None:
            return self
        return self.filter(user_id__in=user_ids)
