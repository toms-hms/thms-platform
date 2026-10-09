"""Communication writes."""

from django.test import TestCase

from communications.models import CommunicationDirection
from communications.services.communication_service import CommunicationService
from jobs.factories import JobFactory


class CreateCommunicationTests(TestCase):
    """CommunicationService.record()"""

    def test_received_messages_are_flagged_for_review(self):
        """An inbound message arrives needing review."""
        job = JobFactory()
        message = CommunicationService().record(direction=CommunicationDirection.RECEIVED, job_id=job.pk)
        self.assertTrue(message.needs_review)

    def test_sent_messages_are_not_flagged(self):
        """An outbound message does not need review."""
        job = JobFactory()
        message = CommunicationService().record(direction=CommunicationDirection.SENT, job_id=job.pk)
        self.assertFalse(message.needs_review)
