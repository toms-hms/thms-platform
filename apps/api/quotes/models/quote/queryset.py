"""Chainable filters for the quote table."""

from typing import Self

from core.querysets import HomeScopedQuerySet


class QuoteQuerySet(HomeScopedQuerySet):
    """Quotes, scoped by their job's home."""

    home_id_path = "job__home_id"

    def filter_job_ids(self, job_ids: list[str] | None) -> Self:
        """Returns quotes on any of the jobs."""
        if job_ids is None:
            return self
        return self.filter(job_id__in=job_ids)
