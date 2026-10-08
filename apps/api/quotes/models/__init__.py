"""The quotes app's models. Each lives in models/<name>/ with its queryset and manager."""

from quotes.models.quote.model import Quote, QuoteStatus

__all__ = [
    "QuoteStatus",
    "Quote",
]
