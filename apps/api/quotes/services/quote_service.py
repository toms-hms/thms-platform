"""Quotes contractors give for a job."""

from decimal import Decimal

from core.errors import NotFoundError
from core.utils.unset_utils import UNSET, Unset
from quotes.models import Quote, QuoteStatus
from quotes.models.quote.manager import QuoteManager


class QuoteService:
    """Records, edits and removes quotes."""

    def __init__(self, *, quote_manager: QuoteManager | None = None) -> None:
        self._quote_manager = quote_manager or Quote.objects

    def create(
        self,
        *,
        job_id: str,
        contractor_id: str,
        amount: Decimal | float,
        description: str | None = None,
        status: str | None = None,
        source_communication_id: str | None = None,
    ) -> Quote:
        """Records a quote from a contractor against the job."""
        return self._quote_manager.create(
            job_id=job_id,
            contractor_id=contractor_id,
            amount=amount,
            description=description,
            status=status or QuoteStatus.DRAFT,
            source_communication_id=source_communication_id,
        )

    def update(
        self,
        *,
        quote_id: str,
        amount: Decimal | float | Unset = UNSET,
        description: str | None | Unset = UNSET,
        status: str | Unset = UNSET,
    ) -> Quote:
        """Applies the provided fields. UNSET leaves a field alone; None clears the description."""
        quote = self._quote_manager.find(pk=quote_id)
        if quote is None:
            raise NotFoundError("Quote")
        return self._quote_manager.apply_updates(quote, amount=amount, description=description, status=status)

    def delete(self, *, quote_id: str) -> None:
        """Deletes the quote."""
        quote = self._quote_manager.find(pk=quote_id)
        if quote is None:
            raise NotFoundError("Quote")
        self._quote_manager.delete(quote)
