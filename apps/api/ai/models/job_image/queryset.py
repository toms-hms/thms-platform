"""Chainable filters for the job image table."""

from typing import Self

from core.querysets import HomeScopedQuerySet


class JobImageQuerySet(HomeScopedQuerySet):
    """Job images, scoped by their job's home."""

    home_id_path = "job__home_id"

    def filter_job_ids(self, job_ids: list[str] | None) -> Self:
        """Returns images attached to any of the jobs."""
        if job_ids is None:
            return self
        return self.filter(job_id__in=job_ids)
