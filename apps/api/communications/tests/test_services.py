"""Communication writes."""

from django.test import TestCase

from communications import services
from communications.models import CommunicationDirection
from jobs.factories import JobFactory


class CreateCommunicationTests(TestCase):
    """create_communication()"""

    def test_received_messages_are_flagged_for_review(self):
        """An inbound message arrives needing review."""
        job = JobFactory()
        message = services.create_communication(direction=CommunicationDirection.RECEIVED, job_id=job.pk)
        self.assertTrue(message.needs_review)

    def test_sent_messages_are_not_flagged(self):
        """An outbound message does not need review."""
        job = JobFactory()
        message = services.create_communication(direction=CommunicationDirection.SENT, job_id=job.pk)
        self.assertFalse(message.needs_review)
