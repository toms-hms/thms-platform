"""Test factories for user accounts."""

import factory
from factory.django import DjangoModelFactory

from accounts.models import User, UserRole
from core.hashing import hash_password

TEST_PASSWORD = "password123"


class UserFactory(DjangoModelFactory):
    """Builds a user whose password is always TEST_PASSWORD."""

    class Meta:
        model = User

    email = factory.Sequence(lambda n: f"test-user-{n}@example.com")
    password = factory.LazyFunction(lambda: hash_password(TEST_PASSWORD, rounds=4))
    first_name = "Test"
    last_name = factory.Sequence(lambda n: f"User{n}")
    role = UserRole.USER


class AdminFactory(UserFactory):
    """Builds a user with the ADMIN role."""

    email = factory.Sequence(lambda n: f"test-admin-{n}@example.com")
    role = UserRole.ADMIN
