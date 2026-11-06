"""Test factory for contractor rows."""

import factory
from factory.django import DjangoModelFactory

from contractors.models import Contractor, ContractorZipCode, TradeCategory


class ContractorFactory(DjangoModelFactory):
    """Builds a global contractor. Pass `zip_codes=[...]` to attach a service area."""

    class Meta:
        model = Contractor
        skip_postgeneration_save = True

    name = factory.Sequence(lambda n: f"Test Contractor {n}")
    company_name = factory.Sequence(lambda n: f"Test Co {n}")
    email = factory.Sequence(lambda n: f"contractor-{n}@example.com")
    phone = factory.Sequence(lambda n: f"512555{n:04d}")
    categories = [TradeCategory.PLUMBING]
    is_global = True

    @factory.post_generation
    def zip_codes(self, create: bool, codes, **kwargs):
        """Creates the contractor's ZIP code rows when a list is supplied."""
        if create and codes:
            ContractorZipCode.objects.bulk_create(
                [ContractorZipCode(contractor=self, zip_code=code) for code in codes]
            )
