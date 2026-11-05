"""Filter compositions and writes for the quote table."""

from core.managers import BaseManager
from quotes.models.quote.queryset import QuoteQuerySet


class QuoteManager(BaseManager.from_queryset(QuoteQuerySet)):
    """Lookups for quotes."""
