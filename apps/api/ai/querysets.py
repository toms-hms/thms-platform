"""Chainable filters for AI generations and job images."""

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


class JobImageQuerySet(HomeScopedQuerySet):
    """Job images, scoped by their job's home."""

    home_id_path = "job__home_id"

    def filter_job_ids(self, job_ids: list[str] | None) -> Self:
        """Returns images attached to any of the jobs."""
        if job_ids is None:
            return self
        return self.filter(job_id__in=job_ids)

    def filter_kinds(self, kinds: list[str] | None) -> Self:
        """Returns images of any of the kinds."""
        if kinds is None:
            return self
        return self.filter(kind__in=kinds)
