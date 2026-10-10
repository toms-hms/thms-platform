"""BaseManager.apply_updates(): the partial-update write every update service uses."""

from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext

from core.errors import ValidationError
from core.utils.unset_utils import UNSET
from quotes.factories import QuoteFactory
from quotes.models import Quote


class ApplyUpdatesTests(TestCase):
    """BaseManager.apply_updates()"""

    def setUp(self):
        """Creates a quote with a description."""
        self.quote = QuoteFactory(amount=100, description="Original")

    def test_unset_fields_are_left_alone(self):
        """A field passed as UNSET keeps its stored value."""
        Quote.objects.apply_updates(self.quote, amount=250, description=UNSET)
        fresh = Quote.objects.get(pk=self.quote.pk)
        self.assertEqual(fresh.amount, 250)
        self.assertEqual(fresh.description, "Original")

    def test_none_clears_a_nullable_field(self):
        """None is an explicit clear, not "no change"."""
        Quote.objects.apply_updates(self.quote, description=None)
        self.assertIsNone(Quote.objects.get(pk=self.quote.pk).description)

    def test_none_on_a_required_field_is_a_validation_error(self):
        """Clearing a NOT NULL column is refused before reaching the database."""
        with self.assertRaises(ValidationError):
            Quote.objects.apply_updates(self.quote, amount=None)

    def test_saves_only_the_changed_columns_and_updated_at(self):
        """The UPDATE is limited to the provided fields plus auto_now timestamps (the audit log writes separately)."""
        before = self.quote.updated_at
        with CaptureQueriesContext(connection) as ctx:
            Quote.objects.apply_updates(self.quote, status=self.quote.status)
        sql = next(q["sql"] for q in ctx.captured_queries if q["sql"].startswith('UPDATE "quotes_quote"'))
        self.assertIn('"status"', sql)
        self.assertIn('"updated_at"', sql)
        self.assertNotIn('"description"', sql)
        self.assertGreaterEqual(Quote.objects.get(pk=self.quote.pk).updated_at, before)

    def test_no_provided_fields_means_no_write(self):
        """All-UNSET updates touch nothing."""
        with self.assertNumQueries(0):
            Quote.objects.apply_updates(self.quote, amount=UNSET, description=UNSET)
