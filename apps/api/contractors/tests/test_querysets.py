"""Contractor queryset filters: absent vs empty, and chaining."""

from django.test import TestCase

from contractors.factories import ContractorFactory
from contractors.models import Contractor, TradeCategory


class ContractorQuerySetTests(TestCase):
    """ContractorQuerySet filters"""

    def setUp(self):
        """Creates a plumber in 78701 and an electrician in 78702."""
        self.plumber = ContractorFactory(
            email="ada@plumb.test", categories=[TradeCategory.PLUMBING], zip_codes=["78701"]
        )
        self.electrician = ContractorFactory(
            email="eli@volt.test", categories=[TradeCategory.ELECTRICAL], zip_codes=["78702"]
        )

    def test_none_leaves_every_filter_off(self):
        """None is an absent filter: the queryset comes back unchanged."""
        contractors = (
            Contractor.objects.filter_ids(None)
            .filter_zip_codes(None)
            .filter_trade_categories(None)
            .filter_emails(None)
            .filter_is_global(None)
            .search(None)
        )
        self.assertEqual(contractors.count(), 2)

    def test_an_empty_list_matches_nothing(self):
        """[] is a filter nothing satisfies, for every list filter."""
        self.assertFalse(Contractor.objects.filter_ids([]).exists())
        self.assertFalse(Contractor.objects.filter_zip_codes([]).exists())
        self.assertFalse(Contractor.objects.filter_trade_categories([]).exists())
        self.assertFalse(Contractor.objects.filter_emails([]).exists())

    def test_filters_chain(self):
        """Each filter narrows the result of the one before."""
        both_zips = Contractor.objects.filter_zip_codes(["78701", "78702"])
        self.assertEqual(both_zips.count(), 2)
        self.assertEqual(
            list(both_zips.filter_trade_categories([TradeCategory.ELECTRICAL]).values_list("pk", flat=True)),
            [self.electrician.pk],
        )

    def test_a_contractor_serving_several_matching_zips_appears_once(self):
        """The ZIP filter is an EXISTS, so multiple matching rows do not duplicate the contractor."""
        ContractorFactory(zip_codes=["78703", "78704"])
        self.assertEqual(Contractor.objects.filter_zip_codes(["78703", "78704"]).count(), 1)

    def test_emails_match_case_insensitively(self):
        """An email filter ignores case."""
        self.assertEqual(
            list(Contractor.objects.filter_emails(["ADA@PLUMB.TEST"]).values_list("pk", flat=True)),
            [self.plumber.pk],
        )
