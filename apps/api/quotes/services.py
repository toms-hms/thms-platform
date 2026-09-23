"""Quote writes."""

from typing import Any

from quotes.models import Quote, QuoteStatus


def create_quote(job_id: str, data: dict[str, Any]) -> Quote:
    """Records a quote from a contractor against the job."""
    return Quote.objects.create(
        job_id=job_id,
        contractor_id=data["contractor_id"],
        amount=data["amount"],
        description=data.get("description"),
        status=data.get("status") or QuoteStatus.DRAFT,
        source_communication_id=data.get("source_communication_id"),
    )


def update_quote(quote_id: str, data: dict[str, Any]) -> Quote:
    """Applies field updates to the quote."""
    quote = Quote.objects.get_or_404(pk=quote_id)
    for field in ("amount", "description", "status"):
        if data.get(field) is not None:
            setattr(quote, field, data[field])
    quote.save()
    return quote


def delete_quote(quote_id: str) -> None:
    """Deletes the quote."""
    Quote.objects.filter(pk=quote_id).delete()
