"""Sending email through a user's connected mailbox."""

from communications.models import Communication, CommunicationDirection
from communications.services.communication_service import CommunicationService
from core.errors import NotFoundError
from core.utils.crypto_utils import decrypt
from integrations.clients.google_client import GoogleClient
from integrations.models import Integration, IntegrationProvider
from integrations.utils.email_utils import build_raw_message


class EmailService:
    """Sends mail from the user's Gmail and records it as a communication on the job."""

    def __init__(
        self, *, google: GoogleClient | None = None, communications: CommunicationService | None = None
    ) -> None:
        self.google = google or GoogleClient()
        self.communications = communications or CommunicationService()

    def send(
        self,
        *,
        user_id: str,
        integration_id: str,
        to: str,
        subject: str,
        body_text: str,
        body_html: str | None = None,
        job_id: str | None = None,
        contractor_id: str | None = None,
    ) -> Communication:
        """Sends the message and returns the recorded communication.

        Raises NotFoundError unless the integration is the user's own Gmail connection.
        """
        integration = (
            Integration.objects.filter(user_id=user_id)
            .filter_ids([integration_id])
            .filter_providers([IntegrationProvider.GOOGLE])
            .first()
        )
        if not integration:
            raise NotFoundError("Integration")

        sent = self.google.send_message(
            access_token=decrypt(integration.access_token_enc),
            refresh_token=decrypt(integration.refresh_token_enc) if integration.refresh_token_enc else None,
            scopes=list(integration.scopes or []),
            raw_message=build_raw_message(to=to, subject=subject, body_text=body_text, body_html=body_html),
        )
        return self.communications.record(
            direction=CommunicationDirection.SENT,
            job_id=job_id,
            contractor_id=contractor_id,
            subject=subject,
            body_text=body_text,
            body_html=body_html,
            external_message_id=sent.message_id,
            external_thread_id=sent.thread_id,
            sent=True,
        )
