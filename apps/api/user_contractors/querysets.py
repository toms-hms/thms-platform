"""Chainable filters for the contractor rolodex."""

from typing import Self

from core.querysets import UserOwnedQuerySet


class UserContractorQuerySet(UserOwnedQuerySet):
    """Rolodex entries. Each entry belongs to one user."""

    def filter_contractor_ids(self, contractor_ids: list[str] | None) -> Self:
        """Returns entries for any of the contractors."""
        if contractor_ids is None:
            return self
        return self.filter(contractor_id__in=contractor_ids)
