"""Google client: OAuth for Gmail and the Gmail send API.

The only module that imports the Google SDKs. No business logic and no
database access: it exchanges codes for tokens and sends raw messages.
"""

from dataclasses import dataclass
from datetime import datetime

from django.conf import settings
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

from core.errors import BadRequestError

TOKEN_URI = "https://oauth2.googleapis.com/token"
SCOPES = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/userinfo.email",
]


@dataclass(frozen=True)
class GoogleConnection:
    """Tokens and identity returned when a user grants Gmail access."""

    access_token: str
    refresh_token: str | None
    expires_at: datetime | None
    scopes: list[str]
    email: str | None


@dataclass(frozen=True)
class SentMessage:
    """Identifiers Gmail assigns to a sent message."""

    message_id: str | None
    thread_id: str | None


class GoogleClient:
    """Google OAuth and Gmail."""

    def _flow(self) -> Flow:
        """Returns a configured OAuth flow. Raises BadRequestError when Google is not configured."""
        if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
            raise BadRequestError("Google OAuth is not configured")
        return Flow.from_client_config(
            {
                "web": {
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": TOKEN_URI,
                    "redirect_uris": [settings.GOOGLE_REDIRECT_URI],
                }
            },
            scopes=SCOPES,
            redirect_uri=settings.GOOGLE_REDIRECT_URI,
        )

    def auth_url(self, *, state: str) -> str:
        """Returns the consent URL, carrying state back to the callback."""
        url, _ = self._flow().authorization_url(access_type="offline", prompt="consent", state=state)
        return url

    def exchange_code(self, *, code: str) -> GoogleConnection:
        """Exchanges an authorization code for tokens and reads the account's email address."""
        flow = self._flow()
        flow.fetch_token(code=code)
        credentials = flow.credentials
        userinfo = build("oauth2", "v2", credentials=credentials).userinfo().get().execute()
        return GoogleConnection(
            access_token=credentials.token,
            refresh_token=credentials.refresh_token,
            expires_at=credentials.expiry,
            scopes=list(credentials.scopes or []),
            email=userinfo.get("email"),
        )

    def send_message(
        self, *, access_token: str, refresh_token: str | None, scopes: list[str], raw_message: str
    ) -> SentMessage:
        """Sends a base64url-encoded RFC 2822 message from the authorised mailbox."""
        credentials = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri=TOKEN_URI,
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
            scopes=scopes,
        )
        gmail = build("gmail", "v1", credentials=credentials)
        sent = gmail.users().messages().send(userId="me", body={"raw": raw_message}).execute()
        return SentMessage(message_id=sent.get("id"), thread_id=sent.get("threadId"))
