"""Microsoft client: OAuth for Outlook through the Microsoft identity platform and Graph.

No business logic and no database access.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta

import requests
from django.conf import settings
from django.utils import timezone

from core.errors import BadRequestError

SCOPES = "https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/Mail.Read offline_access"


@dataclass(frozen=True)
class MicrosoftConnection:
    """Tokens and identity returned when a user grants Outlook access."""

    access_token: str
    refresh_token: str | None
    expires_at: datetime | None
    scopes: list[str]
    email: str | None


class MicrosoftClient:
    """Microsoft OAuth and Graph."""

    def _authority(self) -> str:
        """Returns the tenant's OAuth base URL."""
        return f"https://login.microsoftonline.com/{settings.MICROSOFT_TENANT_ID}/oauth2/v2.0"

    def auth_url(self, *, state: str) -> str:
        """Returns the consent URL, carrying state back to the callback."""
        if not settings.MICROSOFT_CLIENT_ID:
            raise BadRequestError("Microsoft OAuth is not configured")
        params = {
            "client_id": settings.MICROSOFT_CLIENT_ID,
            "response_type": "code",
            "redirect_uri": settings.MICROSOFT_REDIRECT_URI,
            "scope": SCOPES,
            "state": state,
            "response_mode": "query",
        }
        query = "&".join(f"{k}={requests.utils.quote(str(v))}" for k, v in params.items())
        return f"{self._authority()}/authorize?{query}"

    def exchange_code(self, *, code: str) -> MicrosoftConnection:
        """Exchanges an authorization code for tokens and reads the account's email address."""
        tokens = requests.post(
            f"{self._authority()}/token",
            data={
                "code": code,
                "client_id": settings.MICROSOFT_CLIENT_ID,
                "client_secret": settings.MICROSOFT_CLIENT_SECRET,
                "redirect_uri": settings.MICROSOFT_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
            timeout=30,
        ).json()
        profile = requests.get(
            "https://graph.microsoft.com/v1.0/me",
            headers={"Authorization": f"Bearer {tokens.get('access_token')}"},
            timeout=30,
        ).json()
        expires_in = tokens.get("expires_in")
        return MicrosoftConnection(
            access_token=tokens["access_token"],
            refresh_token=tokens.get("refresh_token"),
            expires_at=timezone.now() + timedelta(seconds=expires_in) if expires_in else None,
            scopes=tokens["scope"].split(" ") if tokens.get("scope") else [],
            email=profile.get("mail") or profile.get("userPrincipalName"),
        )
