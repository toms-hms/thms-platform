"""Filter compositions and writes for the quote table."""

from core.managers import BaseManager
from quotes.models.quote.queryset import QuoteQuerySet


class QuoteManager(BaseManager.from_queryset(QuoteQuerySet)):
    """Lookups for quotes."""

    def list_for_job(self, job_id: str) -> QuoteQuerySet:
        """Returns the quotes on a job with contractors preloaded."""
        return self.filter_job_ids([job_id]).select_related("contractor")
