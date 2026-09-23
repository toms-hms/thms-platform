"""Test factories for rolodex entries."""

import factory
from factory.django import DjangoModelFactory

from accounts.factories import UserFactory
from contractors.factories import ContractorFactory
from user_contractors.models import UserContractor


class UserContractorFactory(DjangoModelFactory):
    """Builds a rolodex entry linking a user to a contractor."""

    class Meta:
        model = UserContractor

    user = factory.SubFactory(UserFactory)
    contractor = factory.SubFactory(ContractorFactory)
