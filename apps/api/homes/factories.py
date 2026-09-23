"""Test factories for homes and membership."""

import factory
from factory.django import DjangoModelFactory

from accounts.factories import UserFactory
from homes.models import Home, HomeRole, UserHome


class HomeFactory(DjangoModelFactory):
    """Builds a home. Pass `owner=<user>` to create the owning membership with it."""

    class Meta:
        model = Home
        skip_postgeneration_save = True

    name = factory.Sequence(lambda n: f"Test Home {n}")
    address1 = factory.Sequence(lambda n: f"{n} Test Street")
    city = "Austin"
    state = "TX"
    zip_code = "78701"
    country = "US"

    @factory.post_generation
    def owner(self, create: bool, user, **kwargs):
        """Creates an OWNER membership for the given user when one is supplied."""
        if create and user:
            UserHome.objects.create(user=user, home=self, role=HomeRole.OWNER)


class UserHomeFactory(DjangoModelFactory):
    """Builds a membership row linking a user to a home."""

    class Meta:
        model = UserHome

    user = factory.SubFactory(UserFactory)
    home = factory.SubFactory(HomeFactory)
    role = HomeRole.OWNER
