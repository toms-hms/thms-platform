"""Sending email through a user's connected mailbox."""

from communications.models import Communication, CommunicationDirection
from communications.services.communication_service import CommunicationService
from core.errors import NotFoundError
from core.utils.crypto_utils import decrypt
from integrations.clients.google_client import GoogleClient
from integrations.models import Integration, IntegrationProvider
from integrations.models.integration.manager import IntegrationManager
from integrations.utils.email_utils import build_raw_message


class EmailService:
    """Sends mail from the user's Gmail and records it as a communication on the job."""

    def __init__(
        self,
        *,
        communication_service: CommunicationService | None = None,
        google: GoogleClient | None = None,
        integration_manager: IntegrationManager | None = None,
    ) -> None:
        self._communication_service = communication_service or CommunicationService()
        self._google = google or GoogleClient()
        self._integration_manager = integration_manager or Integration.objects

    def send(
        self,
        *,
        integration_id: str,
        user_id: str,
        body_text: str,
        subject: str,
        to: str,
        contractor_id: str | None = None,
        job_id: str | None = None,
        body_html: str | None = None,
    ) -> Communication:
        """Sends the message and returns the recorded communication.

        Raises NotFoundError unless the integration is the user's own Gmail connection.
        """
        integration = self._integration_manager.find(
            user_id=user_id, pk=integration_id, provider=IntegrationProvider.GOOGLE
        )
        if integration is None:
            raise NotFoundError("Integration")

        sent = self._google.send_message(
            access_token=decrypt(integration.access_token_enc),
            raw_message=build_raw_message(body_text=body_text, subject=subject, to=to, body_html=body_html),
            refresh_token=decrypt(integration.refresh_token_enc) if integration.refresh_token_enc else None,
            scopes=list(integration.scopes or []),
        )
        return self._communication_service.create(
            direction=CommunicationDirection.SENT,
            contractor_id=contractor_id,
            external_message_id=sent.message_id,
            external_thread_id=sent.thread_id,
            job_id=job_id,
            body_html=body_html,
            body_text=body_text,
            sent=True,
            subject=subject,
        )
