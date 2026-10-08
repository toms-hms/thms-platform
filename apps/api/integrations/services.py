"""Connecting third-party accounts and sending mail through them.

Tokens are encrypted before they are stored and decrypted only at the moment of
use. The OAuth `state` parameter carries the id of the user who started the flow,
which the callback view hands back here.
"""

import base64
from datetime import timedelta
from typing import Any

import requests
from django.conf import settings
from django.utils import timezone
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

from communications import services as communications
from communications.models import CommunicationDirection
from core.crypto import decrypt, encrypt
from core.errors import BadRequestError, NotFoundError
from integrations.models import Integration, IntegrationProvider, IntegrationType

GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/userinfo.email",
]
MICROSOFT_SCOPES = (
    "https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/Mail.Read offline_access"
)


def _google_flow() -> Flow:
    """Returns a configured Google OAuth flow, raising when the client is not configured."""
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise BadRequestError("Google OAuth is not configured")
    return Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [settings.GOOGLE_REDIRECT_URI],
            }
        },
        scopes=GOOGLE_SCOPES,
        redirect_uri=settings.GOOGLE_REDIRECT_URI,
    )


def get_google_auth_url(user_id: str) -> str:
    """Returns the Google consent URL the user should be sent to."""
    url, _ = _google_flow().authorization_url(access_type="offline", prompt="consent", state=str(user_id))
    return url


def handle_google_callback(*, code: str, user_id: str) -> Integration:
    """Exchanges the authorization code for tokens and stores the Gmail connection."""
    flow = _google_flow()
    flow.fetch_token(code=code)
    credentials = flow.credentials
    userinfo = build("oauth2", "v2", credentials=credentials).userinfo().get().execute()

    return Integration.objects.upsert_by_provider(
        user_id,
        IntegrationProvider.GOOGLE,
        type=IntegrationType.EMAIL,
        access_token_enc=encrypt(credentials.token),
        refresh_token_enc=encrypt(credentials.refresh_token) if credentials.refresh_token else None,
        token_expires_at=credentials.expiry,
        email=userinfo.get("email"),
        scopes=list(credentials.scopes or []),
    )


def get_microsoft_auth_url(user_id: str) -> str:
    """Returns the Microsoft consent URL the user should be sent to."""
    if not settings.MICROSOFT_CLIENT_ID:
        raise BadRequestError("Microsoft OAuth is not configured")
    params = {
        "client_id": settings.MICROSOFT_CLIENT_ID,
        "response_type": "code",
        "redirect_uri": settings.MICROSOFT_REDIRECT_URI,
        "scope": MICROSOFT_SCOPES,
        "state": str(user_id),
        "response_mode": "query",
    }
    query = "&".join(f"{k}={requests.utils.quote(str(v))}" for k, v in params.items())
    return f"https://login.microsoftonline.com/{settings.MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize?{query}"


def handle_microsoft_callback(*, code: str, user_id: str) -> Integration:
    """Exchanges the authorization code for tokens and stores the Outlook connection."""
    token_url = f"https://login.microsoftonline.com/{settings.MICROSOFT_TENANT_ID}/oauth2/v2.0/token"
    tokens = requests.post(
        token_url,
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
    return Integration.objects.upsert_by_provider(
        user_id,
        IntegrationProvider.MICROSOFT,
        type=IntegrationType.EMAIL,
        access_token_enc=encrypt(tokens["access_token"]),
        refresh_token_enc=encrypt(tokens["refresh_token"]) if tokens.get("refresh_token") else None,
        token_expires_at=timezone.now() + timedelta(seconds=expires_in) if expires_in else None,
        email=profile.get("mail") or profile.get("userPrincipalName"),
        scopes=(tokens.get("scope") or "").split(" ") if tokens.get("scope") else [],
    )


def save_ai_integration(user_id: str, provider: str, api_key: str) -> Integration:
    """Stores an AI provider API key as an encrypted integration."""
    return Integration.objects.upsert_by_provider(
        user_id,
        IntegrationProvider.OPENAI,
        type=IntegrationType.AI,
        access_token_enc=encrypt(api_key),
        refresh_token_enc=None,
        token_expires_at=None,
        email=None,
        scopes=[],
    )


def disconnect_integration(integration_id: str) -> None:
    """Removes a connected account. The caller has already checked ownership."""
    Integration.objects.get_or_404(pk=integration_id).delete()


def _gmail_credentials(integration: Integration) -> Credentials:
    """Returns Google credentials rebuilt from the integration's stored tokens."""
    return Credentials(
        token=decrypt(integration.access_token_enc),
        refresh_token=decrypt(integration.refresh_token_enc) if integration.refresh_token_enc else None,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        scopes=list(integration.scopes or []),
    )


def send_via_gmail(
    *,
    user_id: str,
    integration_id: str,
    to: str,
    subject: str,
    body_text: str,
    body_html: str | None = None,
    job_id: str | None = None,
    contractor_id: str | None = None,
) -> dict[str, Any]:
    """Sends an email through the user's Gmail connection and records it as a communication."""
    integration = Integration.objects.filter(pk=integration_id).first()
    if (
        not integration
        or str(integration.user_id) != str(user_id)
        or integration.provider != IntegrationProvider.GOOGLE
    ):
        raise NotFoundError("Integration")

    message = "\r\n".join(
        [
            f"To: {to}",
            f"Subject: {subject}",
            "MIME-Version: 1.0",
            "Content-Type: text/html; charset=utf-8",
            "",
            body_html or body_text,
        ]
    )
    raw = base64.urlsafe_b64encode(message.encode()).decode()

    gmail = build("gmail", "v1", credentials=_gmail_credentials(integration))
    sent = gmail.users().messages().send(userId="me", body={"raw": raw}).execute()

    communication = communications.create_communication(
        direction=CommunicationDirection.SENT,
        job_id=job_id,
        contractor_id=contractor_id,
        subject=subject,
        body_text=body_text,
        body_html=body_html,
        external_message_id=sent.get("id"),
        external_thread_id=sent.get("threadId"),
        sent_at=timezone.now(),
    )
    communication.needs_review = False
    communication.save(update_fields=["needs_review", "updated_at"])
    return {"communication": communication, "status": "SENT"}
