"""Quote writes."""

import uuid

from django.test import TestCase

from core.errors import NotFoundError
from quotes.factories import QuoteFactory
from quotes.models import Quote, QuoteStatus
from quotes.services.quote_service import QuoteService


class QuoteServiceTests(TestCase):
    """QuoteService.update() / delete()"""

    def test_update_applies_the_given_fields(self):
        """Only the fields passed are changed."""
        quote = QuoteFactory()
        QuoteService().update(quote_id=quote.pk, status=QuoteStatus.CONFIRMED)
        quote.refresh_from_db()
        self.assertEqual(quote.status, QuoteStatus.CONFIRMED)

    def test_update_of_a_missing_quote_is_not_found(self):
        """A quote id that matches nothing raises NotFoundError."""
        with self.assertRaises(NotFoundError):
            QuoteService().update(quote_id=str(uuid.uuid4()), status=QuoteStatus.CONFIRMED)

    def test_delete_removes_the_quote(self):
        """The quote row is gone afterwards."""
        quote = QuoteFactory()
        QuoteService().delete(quote_id=quote.pk)
        self.assertIsNone(Quote.objects.find(pk=quote.pk))

    def test_delete_of_a_missing_quote_is_not_found(self):
        """A quote id that matches nothing raises NotFoundError."""
        with self.assertRaises(NotFoundError):
            QuoteService().delete(quote_id=str(uuid.uuid4()))
