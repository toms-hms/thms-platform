"""Connected accounts and sending mail through them, with the provider clients replaced by fakes."""

from unittest.mock import MagicMock

from django.test import TestCase

from accounts.factories import UserFactory
from communications.models import CommunicationDirection
from core.errors import NotFoundError
from core.utils.crypto_utils import decrypt
from homes.factories import HomeFactory
from integrations.clients.google_client import GoogleClient, GoogleConnection, SentMessage
from integrations.clients.microsoft_client import MicrosoftClient
from integrations.factories import IntegrationFactory
from integrations.models import Integration, IntegrationProvider, IntegrationType
from integrations.services.email_service import EmailService
from integrations.services.integration_service import IntegrationService
from jobs.factories import JobFactory


def integration_service(*, google: MagicMock | None = None) -> IntegrationService:
    """Returns an IntegrationService whose provider clients are fakes."""
    return IntegrationService(
        google=google or MagicMock(spec=GoogleClient), microsoft=MagicMock(spec=MicrosoftClient)
    )


class SaveAiKeyTests(TestCase):
    """IntegrationService.save_ai_key()"""

    def test_stores_the_key_encrypted(self):
        """The API key is encrypted at rest and never stored as plaintext."""
        integration = integration_service().save_ai_key(
            user_id=UserFactory().pk, provider="openai", api_key="sk-secret-value"
        )
        self.assertNotIn("sk-secret-value", integration.access_token_enc)
        self.assertEqual(decrypt(integration.access_token_enc), "sk-secret-value")
        self.assertEqual(integration.type, IntegrationType.AI)

    def test_replaces_an_existing_key_for_the_same_provider(self):
        """Saving again updates the connection rather than adding a second one."""
        user = UserFactory()
        service = integration_service()
        service.save_ai_key(user_id=user.pk, provider="openai", api_key="first")
        service.save_ai_key(user_id=user.pk, provider="openai", api_key="second")
        integrations = Integration.objects.filter(user=user, provider=IntegrationProvider.OPENAI)
        self.assertEqual(integrations.count(), 1)
        self.assertEqual(decrypt(integrations.first().access_token_enc), "second")


class ConnectGoogleTests(TestCase):
    """IntegrationService.connect_google()"""

    def test_stores_the_connection_with_encrypted_tokens(self):
        """The exchanged tokens are stored encrypted, with the account's email."""
        google = MagicMock(spec=GoogleClient)
        google.exchange_code.return_value = GoogleConnection(
            access_token="ya29.access",
            refresh_token="1//refresh",
            expires_at=None,
            scopes=["s"],
            email="a@b.test",
        )
        integration = integration_service(google=google).connect_google(
            user_id=UserFactory().pk, code="code-1"
        )

        google.exchange_code.assert_called_once_with(code="code-1")
        self.assertEqual(integration.provider, IntegrationProvider.GOOGLE)
        self.assertEqual(decrypt(integration.access_token_enc), "ya29.access")
        self.assertEqual(integration.email, "a@b.test")


class DisconnectTests(TestCase):
    """IntegrationService.disconnect()"""

    def test_deletes_the_connection(self):
        """The connection is removed. Ownership is checked by the resolver's @owner_required."""
        integration = IntegrationFactory()
        integration_service().disconnect(integration_id=integration.pk)
        self.assertFalse(Integration.objects.filter(pk=integration.pk).exists())

    def test_an_unknown_connection_is_not_found(self):
        """Disconnecting an id that does not exist raises NotFoundError."""
        with self.assertRaises(NotFoundError):
            integration_service().disconnect(integration_id="missing")


class SendEmailTests(TestCase):
    """EmailService.send()"""

    def setUp(self):
        """Creates a user with a Gmail connection, a job to send about and a fake Google client."""
        self.user = UserFactory()
        self.integration = IntegrationFactory(user=self.user)
        self.job = JobFactory(home=HomeFactory(owner=self.user), created_by=self.user)
        self.google = MagicMock(spec=GoogleClient)
        self.google.send_message.return_value = SentMessage(message_id="msg-1", thread_id="thread-1")

    def test_records_the_sent_message(self):
        """A sent email is stored as an outbound communication that needs no review."""
        message = EmailService(google=self.google).send(
            user_id=self.user.pk,
            integration_id=self.integration.pk,
            to="contractor@example.test",
            subject="Quote request",
            body_text="Hello",
            job_id=self.job.pk,
        )

        self.assertEqual(message.direction, CommunicationDirection.SENT)
        self.assertEqual(message.external_message_id, "msg-1")
        self.assertIsNotNone(message.sent_at)
        self.assertFalse(message.needs_review)

    def test_rejects_an_integration_belonging_to_someone_else(self):
        """A connection the caller does not own cannot be used to send, and nothing is sent."""
        with self.assertRaises(NotFoundError):
            EmailService(google=self.google).send(
                user_id=UserFactory().pk,
                integration_id=self.integration.pk,
                to="x@example.test",
                subject="s",
                body_text="b",
            )
        self.google.send_message.assert_not_called()
