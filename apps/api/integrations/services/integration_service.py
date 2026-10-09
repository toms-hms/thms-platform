"""Connecting and disconnecting third-party accounts.

Tokens are encrypted before they are stored and decrypted only at the moment of
use. The OAuth `state` parameter carries the id of the user who started the
flow (see THM-28 for signing it).
"""

from core.utils.crypto_utils import encrypt
from integrations.clients.google_client import GoogleClient, GoogleConnection
from integrations.clients.microsoft_client import MicrosoftClient, MicrosoftConnection
from integrations.models import Integration, IntegrationProvider, IntegrationType


class IntegrationService:
    """Stores, replaces and removes a user's connected accounts."""

    def __init__(
        self, *, google: GoogleClient | None = None, microsoft: MicrosoftClient | None = None
    ) -> None:
        self.google = google or GoogleClient()
        self.microsoft = microsoft or MicrosoftClient()

    def google_auth_url(self, *, user_id: str) -> str:
        """Returns the Google consent URL for the user."""
        return self.google.auth_url(state=str(user_id))

    def microsoft_auth_url(self, *, user_id: str) -> str:
        """Returns the Microsoft consent URL for the user."""
        return self.microsoft.auth_url(state=str(user_id))

    def connect_google(self, *, user_id: str, code: str) -> Integration:
        """Exchanges the authorization code and stores the user's Gmail connection."""
        return self._store_email_connection(
            user_id=user_id,
            provider=IntegrationProvider.GOOGLE,
            connection=self.google.exchange_code(code=code),
        )

    def connect_microsoft(self, *, user_id: str, code: str) -> Integration:
        """Exchanges the authorization code and stores the user's Outlook connection."""
        return self._store_email_connection(
            user_id=user_id,
            provider=IntegrationProvider.MICROSOFT,
            connection=self.microsoft.exchange_code(code=code),
        )

    def _store_email_connection(
        self, *, user_id: str, provider: str, connection: GoogleConnection | MicrosoftConnection
    ) -> Integration:
        """Creates or replaces the user's connection for the provider, encrypting its tokens."""
        return Integration.objects.upsert_by_provider(
            user_id=user_id,
            provider=provider,
            type=IntegrationType.EMAIL,
            access_token_enc=encrypt(connection.access_token),
            refresh_token_enc=encrypt(connection.refresh_token) if connection.refresh_token else None,
            token_expires_at=connection.expires_at,
            email=connection.email,
            scopes=connection.scopes,
        )

    def save_ai_key(self, *, user_id: str, provider: str, api_key: str) -> Integration:
        """Stores an AI provider API key as an encrypted integration."""
        return Integration.objects.upsert_by_provider(
            user_id=user_id,
            provider=IntegrationProvider.OPENAI,
            type=IntegrationType.AI,
            access_token_enc=encrypt(api_key),
            refresh_token_enc=None,
            token_expires_at=None,
            email=None,
            scopes=[],
        )

    def disconnect(self, *, integration_id: str) -> None:
        """Removes a connected account. The caller has already checked ownership."""
        Integration.objects.get_or_404(pk=integration_id).delete()
