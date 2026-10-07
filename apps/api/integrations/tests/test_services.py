"""Connected accounts and sending mail through them, with providers mocked."""

from unittest.mock import MagicMock, patch

from django.test import TestCase, override_settings

from accounts.factories import UserFactory
from communications.models import Communication, CommunicationDirection
from core.crypto import decrypt
from core.errors import NotFoundError
from homes.factories import HomeFactory
from integrations import services
from integrations.factories import IntegrationFactory
from integrations.models import Integration, IntegrationProvider, IntegrationType
from jobs.factories import JobFactory


class SaveAiIntegrationTests(TestCase):
    """save_ai_integration()"""

    def test_stores_the_key_encrypted(self):
        """The API key is encrypted at rest and never stored as plaintext."""
        user = UserFactory()
        integration = services.save_ai_integration(user.pk, "openai", "sk-secret-value")
        self.assertNotIn("sk-secret-value", integration.access_token_enc)
        self.assertEqual(decrypt(integration.access_token_enc), "sk-secret-value")
        self.assertEqual(integration.type, IntegrationType.AI)

    def test_replaces_an_existing_key_for_the_same_provider(self):
        """Saving again updates the connection rather than adding a second one."""
        user = UserFactory()
        services.save_ai_integration(user.pk, "openai", "first")
        services.save_ai_integration(user.pk, "openai", "second")
        integrations = Integration.objects.filter(user=user, provider=IntegrationProvider.OPENAI)
        self.assertEqual(integrations.count(), 1)
        self.assertEqual(decrypt(integrations.first().access_token_enc), "second")


class DisconnectTests(TestCase):
    """disconnect_integration()"""

    def test_deletes_the_connection(self):
        """The connection is removed. Ownership is checked by the resolver's @owner_required."""
        integration = IntegrationFactory()
        services.disconnect_integration(integration.pk)
        self.assertFalse(Integration.objects.filter(pk=integration.pk).exists())

    def test_an_unknown_connection_is_not_found(self):
        """Disconnecting an id that does not exist raises NotFoundError."""
        with self.assertRaises(NotFoundError):
            services.disconnect_integration("missing")


@override_settings(GOOGLE_CLIENT_ID="client-id", GOOGLE_CLIENT_SECRET="client-secret")
class SendViaGmailTests(TestCase):
    """send_via_gmail()"""

    def setUp(self):
        """Creates a user with a Gmail connection and a job to send about."""
        self.user = UserFactory()
        self.integration = IntegrationFactory(user=self.user)
        self.job = JobFactory(home=HomeFactory(owner=self.user), created_by=self.user)

    def test_records_the_sent_message(self):
        """A sent email is stored as an outbound communication that needs no review."""
        gmail = MagicMock()
        gmail.users.return_value.messages.return_value.send.return_value.execute.return_value = {
            "id": "msg-1",
            "threadId": "thread-1",
        }
        with patch.object(services, "build", return_value=gmail):
            result = services.send_via_gmail(
                user_id=self.user.pk,
                integration_id=self.integration.pk,
                to="contractor@example.test",
                subject="Quote request",
                body_text="Hello",
                job_id=self.job.pk,
            )

        message = Communication.objects.get(pk=result["communication"].pk)
        self.assertEqual(message.direction, CommunicationDirection.SENT)
        self.assertEqual(message.external_message_id, "msg-1")
        self.assertFalse(message.needs_review)

    def test_rejects_an_integration_belonging_to_someone_else(self):
        """A connection the caller does not own cannot be used to send."""
        with self.assertRaises(NotFoundError):
            services.send_via_gmail(
                user_id=UserFactory().pk,
                integration_id=self.integration.pk,
                to="x@example.test",
                subject="s",
                body_text="b",
            )
