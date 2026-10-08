"""Chainable filters for the ai generation table."""

from typing import Self

from core.querysets import HomeScopedQuerySet


class AIGenerationQuerySet(HomeScopedQuerySet):
    """Generation records, scoped by their job's home."""

    home_id_path = "job__home_id"

    def filter_job_ids(self, job_ids: list[str] | None) -> Self:
        """Returns generations recorded against any of the jobs."""
        if job_ids is None:
            return self
        return self.filter(job_id__in=job_ids)
