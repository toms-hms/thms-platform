"""Chainable filters for communications."""

from typing import Self

from core.querysets import HomeScopedQuerySet


class CommunicationQuerySet(HomeScopedQuerySet):
    """Messages, scoped by their job's home. A message with no job belongs to no home."""

    home_id_path = "job__home_id"

    def filter_job_ids(self, job_ids: list[str] | None) -> Self:
        """Returns messages about any of the jobs."""
        if job_ids is None:
            return self
        return self.filter(job_id__in=job_ids)

    def filter_contractor_ids(self, contractor_ids: list[str] | None) -> Self:
        """Returns messages exchanged with any of the contractors."""
        if contractor_ids is None:
            return self
        return self.filter(contractor_id__in=contractor_ids)

    def filter_needs_review(self, needs_review: bool | None) -> Self:
        """Returns messages flagged (True) or not flagged (False) for review."""
        if needs_review is None:
            return self
        return self.filter(needs_review=needs_review)

    def filter_directions(self, directions: list[str] | None) -> Self:
        """Returns messages in any of the directions."""
        if directions is None:
            return self
        return self.filter(direction__in=directions)
