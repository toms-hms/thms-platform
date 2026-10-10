"""Recording and reviewing messages exchanged with contractors.

Inbound messages land with `needs_review` set so the user is prompted to read
them; messages the platform sends do not.
"""

from datetime import datetime

from django.utils import timezone

from communications.models import Communication, CommunicationChannel, CommunicationDirection
from core.utils.unset_utils import UNSET, Unset


class CommunicationService:
    """Writes to the message log."""

    def record(
        self,
        *,
        direction: str,
        job_id: str | None = None,
        contractor_id: str | None = None,
        subject: str | None = None,
        body_text: str | None = None,
        body_html: str | None = None,
        external_thread_id: str | None = None,
        external_message_id: str | None = None,
        sent: bool = False,
        received_at: datetime | None = None,
    ) -> Communication:
        """Records one email. `sent=True` stamps sent_at now; received messages are flagged for review."""
        return Communication.objects.create(
            job_id=job_id,
            contractor_id=contractor_id,
            channel=CommunicationChannel.EMAIL,
            direction=direction,
            subject=subject,
            body_text=body_text,
            body_html=body_html,
            external_thread_id=external_thread_id,
            external_message_id=external_message_id,
            sent_at=timezone.now() if sent else None,
            received_at=received_at,
            needs_review=direction == CommunicationDirection.RECEIVED,
        )

    def update(
        self,
        *,
        communication_id: str,
        needs_review: bool | Unset = UNSET,
        parsed_summary: str | None | Unset = UNSET,
    ) -> Communication:
        """Updates the review flag or parsed summary. UNSET leaves a field alone; None clears it."""
        communication = Communication.objects.get_or_404(pk=communication_id)
        return Communication.objects.apply_updates(
            communication, needs_review=needs_review, parsed_summary=parsed_summary
        )
