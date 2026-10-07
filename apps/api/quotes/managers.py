"""Query compositions for quotes."""

from core.managers import BaseManager
from quotes.querysets import QuoteQuerySet


class QuoteManager(BaseManager.from_queryset(QuoteQuerySet)):
    """Lookups for quotes."""

    def list_for_job(self, job_id: str) -> QuoteQuerySet:
        """Returns the quotes on a job with contractors preloaded."""
        return self.filter_job_ids([job_id]).select_related("contractor")
