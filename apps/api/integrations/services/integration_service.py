"""Connecting and disconnecting third-party accounts.

Tokens are encrypted before they are stored and decrypted only at the moment of
use. The OAuth `state` parameter carries the id of the user who started the
flow (see THM-28 for signing it).
"""

from core.errors import NotFoundError
from core.utils.crypto_utils import encrypt
from integrations.clients.google_client import GoogleClient, GoogleConnection
from integrations.clients.microsoft_client import MicrosoftClient, MicrosoftConnection
from integrations.models import Integration, IntegrationProvider, IntegrationType
from integrations.models.integration.manager import IntegrationManager


class IntegrationService:
    """Stores, replaces and removes a user's connected accounts."""

    def __init__(
        self,
        *,
        google: GoogleClient | None = None,
        integration_manager: IntegrationManager | None = None,
        microsoft: MicrosoftClient | None = None,
    ) -> None:
        self._google = google or GoogleClient()
        self._integration_manager = integration_manager or Integration.objects
        self._microsoft = microsoft or MicrosoftClient()

    def google_auth_url(self, *, user_id: str) -> str:
        """Returns the Google consent URL for the user."""
        return self._google.auth_url(state=str(user_id))

    def microsoft_auth_url(self, *, user_id: str) -> str:
        """Returns the Microsoft consent URL for the user."""
        return self._microsoft.auth_url(state=str(user_id))

    def connect_google(self, *, user_id: str, code: str) -> Integration:
        """Exchanges the authorization code and stores the user's Gmail connection."""
        return self._store_email_connection(
            user_id=user_id,
            connection=self._google.exchange_code(code=code),
            provider=IntegrationProvider.GOOGLE,
        )

    def connect_microsoft(self, *, user_id: str, code: str) -> Integration:
        """Exchanges the authorization code and stores the user's Outlook connection."""
        return self._store_email_connection(
            user_id=user_id,
            connection=self._microsoft.exchange_code(code=code),
            provider=IntegrationProvider.MICROSOFT,
        )

    def _store_email_connection(
        self, *, user_id: str, connection: GoogleConnection | MicrosoftConnection, provider: str
    ) -> Integration:
        """Creates or replaces the user's connection for the provider, encrypting its tokens."""
        return self._integration_manager.upsert_by_provider(
            user_id=user_id,
            provider=provider,
            access_token_enc=encrypt(connection.access_token),
            email=connection.email,
            refresh_token_enc=encrypt(connection.refresh_token) if connection.refresh_token else None,
            scopes=connection.scopes,
            token_expires_at=connection.expires_at,
            type=IntegrationType.EMAIL,
        )

    def create_ai(self, *, user_id: str, api_key: str, provider: str) -> Integration:
        """Stores an AI provider API key as an encrypted integration."""
        return self._integration_manager.upsert_by_provider(
            user_id=user_id,
            provider=IntegrationProvider.OPENAI,
            access_token_enc=encrypt(api_key),
            email=None,
            refresh_token_enc=None,
            scopes=[],
            token_expires_at=None,
            type=IntegrationType.AI,
        )

    def delete(self, *, integration_id: str) -> None:
        """Removes a connected account. The caller has already checked ownership."""
        integration = self._integration_manager.find(pk=integration_id)
        if integration is None:
            raise NotFoundError("Integration")
        self._integration_manager.delete(integration)
