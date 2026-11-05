"""Recording and reviewing messages exchanged with contractors.

Inbound messages land with `needs_review` set so the user is prompted to read
them; messages the platform sends do not.
"""

from datetime import datetime

from django.utils import timezone

from communications.models import Communication, CommunicationChannel, CommunicationDirection
from communications.models.communication.manager import CommunicationManager
from core.errors import NotFoundError
from core.utils.unset_utils import UNSET, Unset


class CommunicationService:
    """Writes to the message log."""

    def __init__(self, *, communication_manager: CommunicationManager | None = None) -> None:
        self._communication_manager = communication_manager or Communication.objects

    def create(
        self,
        *,
        direction: str,
        contractor_id: str | None = None,
        external_message_id: str | None = None,
        external_thread_id: str | None = None,
        job_id: str | None = None,
        body_html: str | None = None,
        body_text: str | None = None,
        received_at: datetime | None = None,
        sent: bool = False,
        subject: str | None = None,
    ) -> Communication:
        """Records one email. `sent=True` stamps sent_at now; received messages are flagged for review."""
        return self._communication_manager.create(
            contractor_id=contractor_id,
            external_message_id=external_message_id,
            external_thread_id=external_thread_id,
            job_id=job_id,
            body_html=body_html,
            body_text=body_text,
            channel=CommunicationChannel.EMAIL,
            direction=direction,
            needs_review=direction == CommunicationDirection.RECEIVED,
            received_at=received_at,
            sent_at=timezone.now() if sent else None,
            subject=subject,
        )

    def update(
        self,
        *,
        communication_id: str,
        needs_review: bool | Unset = UNSET,
        parsed_summary: str | None | Unset = UNSET,
    ) -> Communication:
        """Updates the review flag or parsed summary. UNSET leaves a field alone; None clears it."""
        communication = self._communication_manager.find(pk=communication_id)
        if communication is None:
            raise NotFoundError("Communication")
        return self._communication_manager.apply_updates(
            communication, needs_review=needs_review, parsed_summary=parsed_summary
        )
