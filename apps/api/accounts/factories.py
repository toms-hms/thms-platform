"""Test factories for user accounts."""

import factory
from django.contrib.auth.hashers import make_password
from factory.django import DjangoModelFactory

from accounts.models import User, UserRole

TEST_PASSWORD = "password123"


class UserFactory(DjangoModelFactory):
    """Builds a user whose password is always TEST_PASSWORD."""

    class Meta:
        model = User

    email = factory.Sequence(lambda n: f"test-user-{n}@example.com")
    password = factory.LazyFunction(lambda: make_password(TEST_PASSWORD))
    first_name = "Test"
    last_name = factory.Sequence(lambda n: f"User{n}")
    role = UserRole.USER


class AdminFactory(UserFactory):
    """Builds a user with the ADMIN role."""

    email = factory.Sequence(lambda n: f"test-admin-{n}@example.com")
    role = UserRole.ADMIN
