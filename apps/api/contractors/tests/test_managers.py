"""Contractor filtering."""

from django.test import TestCase

from contractors.factories import ContractorFactory
from contractors.models import Contractor, ContractorZipCode, TradeCategory
from jobs.factories import JobContractorFactory


class FilterContractorsTests(TestCase):
    """ContractorManager.filter_contractors()"""

    def setUp(self):
        """Creates a plumber in 78701 and an electrician in 78702."""
        self.plumber = ContractorFactory(
            name="Ada Plumb",
            company_name="Plumb Co",
            email="ada@plumb.test",
            categories=[TradeCategory.PLUMBING],
            zip_codes=["78701"],
        )
        self.electrician = ContractorFactory(
            name="Eli Volt",
            company_name="Volt Co",
            email="eli@volt.test",
            categories=[TradeCategory.ELECTRICAL],
            zip_codes=["78702"],
        )

    def test_filters_by_trade_category(self):
        """Only contractors working in the requested trade come back."""
        results = Contractor.objects.filter_contractors(trade_categories=[TradeCategory.PLUMBING])
        self.assertEqual([c.pk for c in results], [self.plumber.pk])

    def test_filters_by_zip_code(self):
        """Only contractors serving the requested ZIP come back."""
        results = Contractor.objects.filter_contractors(zip_codes=["78702"])
        self.assertEqual([c.pk for c in results], [self.electrician.pk])

    def test_search_matches_name_company_and_email(self):
        """Search text matches against name, company name and email, case-insensitively."""
        self.assertEqual(
            [c.pk for c in Contractor.objects.filter_contractors(search="ada")], [self.plumber.pk]
        )
        self.assertEqual(
            [c.pk for c in Contractor.objects.filter_contractors(search="volt co")], [self.electrician.pk]
        )
        self.assertEqual(
            [c.pk for c in Contractor.objects.filter_contractors(search="@plumb")], [self.plumber.pk]
        )

    def test_empty_filter_list_matches_nothing(self):
        """An empty list is a filter that nothing satisfies, not an absent filter."""
        self.assertEqual(list(Contractor.objects.filter_contractors(ids=[])), [])
        self.assertEqual(list(Contractor.objects.filter_contractors(trade_categories=[])), [])

    def test_omitted_filters_are_ignored(self):
        """Passing no filters returns every contractor."""
        self.assertEqual(Contractor.objects.filter_contractors().count(), 2)

    def test_private_contractors_are_excluded_from_the_global_list(self):
        """A contractor with is_global false is not in the directory."""
        ContractorFactory(is_global=False)
        results = Contractor.objects.filter_contractors(is_global=True)
        self.assertEqual({c.pk for c in results}, {self.plumber.pk, self.electrician.pk})


class ZipCodesTests(TestCase):
    """ContractorZipCodeManager.zip_codes_for() / replace_for_contractor()"""

    def test_returns_the_service_area(self):
        """Every ZIP code the contractor serves comes back."""
        contractor = ContractorFactory(zip_codes=["78701", "78702"])
        self.assertEqual(
            sorted(ContractorZipCode.objects.zip_codes_for(contractor_id=contractor.pk)), ["78701", "78702"]
        )

    def test_replace_sets_exactly_the_given_codes(self):
        """Replacing drops the old codes and keeps only the new ones."""
        contractor = ContractorFactory(zip_codes=["78701", "78702"])
        ContractorZipCode.objects.replace_for_contractor(contractor=contractor, zip_codes=["90210"])
        self.assertEqual(ContractorZipCode.objects.zip_codes_for(contractor_id=contractor.pk), ["90210"])


class JobHistoryTests(TestCase):
    """ContractorManager.list_job_history()"""

    def test_returns_the_contractors_assignments(self):
        """Each row names the job, its home and the assignment's status."""
        assignment = JobContractorFactory()
        history = Contractor.objects.list_job_history(contractor_ids=[assignment.contractor_id])
        self.assertEqual(len(history), 1)
        self.assertEqual(history[0]["job_id"], assignment.job_id)
        self.assertEqual(history[0]["home_name"], assignment.job.home.name)
