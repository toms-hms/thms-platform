"""Test factories for connected accounts."""

import factory
from factory.django import DjangoModelFactory

from accounts.factories import UserFactory
from core.crypto import encrypt
from integrations.models import Integration, IntegrationProvider, IntegrationType


class IntegrationFactory(DjangoModelFactory):
    """Builds a Gmail connection with encrypted placeholder tokens."""

    class Meta:
        model = Integration

    user = factory.SubFactory(UserFactory)
    type = IntegrationType.EMAIL
    provider = IntegrationProvider.GOOGLE
    access_token_enc = factory.LazyFunction(lambda: encrypt("test-access-token"))
    refresh_token_enc = factory.LazyFunction(lambda: encrypt("test-refresh-token"))
    email = factory.Sequence(lambda n: f"inbox-{n}@example.com")
    scopes = ["https://www.googleapis.com/auth/gmail.send"]
