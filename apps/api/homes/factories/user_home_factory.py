"""Test factory for user home rows."""

import factory
from factory.django import DjangoModelFactory

from accounts.factories import UserFactory
from homes.factories.home_factory import HomeFactory
from homes.models import HomeRole, UserHome


class UserHomeFactory(DjangoModelFactory):
    """Builds a membership row linking a user to a home."""

    class Meta:
        model = UserHome

    user = factory.SubFactory(UserFactory)
    home = factory.SubFactory(HomeFactory)
    role = HomeRole.OWNER
