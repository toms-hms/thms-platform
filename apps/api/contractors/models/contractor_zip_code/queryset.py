"""Chainable filters for the contractor zip code table."""

from typing import Self

from core.querysets import BaseQuerySet


class ContractorZipCodeQuerySet(BaseQuerySet):
    """Service-area rows."""

    def filter_contractor_ids(self, contractor_ids: list[str] | None) -> Self:
        """Returns the ZIP code rows for any of the contractors."""
        if contractor_ids is None:
            return self
        return self.filter(contractor_id__in=contractor_ids)
