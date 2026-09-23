"""Communication writes.

Inbound messages land with `needs_review` set so the user is prompted to read
them; messages the platform sends do not.
"""

from datetime import datetime
from typing import Any

from communications.models import Communication, CommunicationChannel, CommunicationDirection


def create_communication(
    *,
    direction: str,
    job_id: str | None = None,
    contractor_id: str | None = None,
    subject: str | None = None,
    body_text: str | None = None,
    body_html: str | None = None,
    external_thread_id: str | None = None,
    external_message_id: str | None = None,
    sent_at: datetime | None = None,
    received_at: datetime | None = None,
) -> Communication:
    """Records one message against a job and contractor."""
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
        sent_at=sent_at,
        received_at=received_at,
        needs_review=direction == CommunicationDirection.RECEIVED,
    )


def update_communication(communication_id: str, data: dict[str, Any]) -> Communication:
    """Updates the review flag or parsed summary on a message."""
    communication = Communication.objects.get_or_404(pk=communication_id)
    for field in ("needs_review", "parsed_summary"):
        if data.get(field) is not None:
            setattr(communication, field, data[field])
    communication.save()
    return communication
