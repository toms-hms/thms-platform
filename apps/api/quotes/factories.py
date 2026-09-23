"""Test factories for quotes."""

import factory
from factory.django import DjangoModelFactory

from contractors.factories import ContractorFactory
from jobs.factories import JobFactory
from quotes.models import Quote, QuoteStatus


class QuoteFactory(DjangoModelFactory):
    """Builds a quote against a job."""

    class Meta:
        model = Quote

    job = factory.SubFactory(JobFactory)
    contractor = factory.SubFactory(ContractorFactory)
    amount = 1500.0
    status = QuoteStatus.DRAFT
