"""Quotes contractors give for a job."""

from decimal import Decimal

from core.errors import NotFoundError
from core.utils.unset_utils import UNSET, Unset
from quotes.models import Quote, QuoteStatus


class QuoteService:
    """Records, edits and removes quotes."""

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
        return Quote.objects.create(
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
        quote = Quote.objects.find(pk=quote_id)
        if quote is None:
            raise NotFoundError("Quote")
        return Quote.objects.apply_updates(quote, amount=amount, description=description, status=status)

    def delete(self, *, quote_id: str) -> None:
        """Deletes the quote."""
        quote = Quote.objects.find(pk=quote_id)
        if quote is None:
            raise NotFoundError("Quote")
        quote.delete()
