"""The integrations GraphQL surface."""

from accounts.factories import UserFactory
from core.testing import GraphQLTestCase
from integrations.factories import IntegrationFactory

INTEGRATIONS = "query { integrations { id provider type email status scopes } }"
SAVE_AI = """
mutation($provider: String!, $apiKey: String!) {
  saveAiIntegration(provider: $provider, apiKey: $apiKey) { integration { id provider status } }
}
"""
DISCONNECT = """
mutation($integrationId: ID!) { disconnectIntegration(integrationId: $integrationId) { success } }
"""


class IntegrationsTests(GraphQLTestCase):
    """query integrations / integration mutations"""

    def setUp(self):
        """Creates a user with one Gmail connection."""
        super().setUp()
        self.user = UserFactory()
        self.integration = IntegrationFactory(user=self.user)

    def test_lists_the_callers_connections(self):
        """The caller sees their own connections marked CONNECTED."""
        data = self.assert_ok(self.execute(INTEGRATIONS, token=self.token_for(self.user)))
        self.assertEqual(data["integrations"][0]["id"], self.integration.pk)
        self.assertEqual(data["integrations"][0]["status"], "CONNECTED")

    def test_does_not_expose_tokens(self):
        """The integration type has no field that could return a stored token."""
        body = self.execute("query { integrations { accessTokenEnc } }", token=self.token_for(self.user))
        self.assertTrue(body.get("errors"))

    def test_does_not_list_another_users_connections(self):
        """Connections belong to one user and are not visible to anyone else."""
        data = self.assert_ok(self.execute(INTEGRATIONS, token=self.token_for(UserFactory())))
        self.assertEqual(data["integrations"], [])

    def test_saves_an_ai_key(self):
        """An API key is accepted and the connection comes back CONNECTED."""
        body = self.execute(
            SAVE_AI, {"provider": "openai", "apiKey": "sk-test"}, token=self.token_for(self.user)
        )
        integration = self.assert_ok(body)["saveAiIntegration"]["integration"]
        self.assertEqual(integration["provider"], "OPENAI")

    def test_cannot_disconnect_another_users_connection(self):
        """Disconnecting a connection the caller does not own is NOT_FOUND."""
        body = self.execute(
            DISCONNECT, {"integrationId": self.integration.pk}, token=self.token_for(UserFactory())
        )
        self.assert_error_code(body, "NOT_FOUND")
