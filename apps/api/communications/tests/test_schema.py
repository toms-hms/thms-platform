"""The communications GraphQL surface and its filters."""

from accounts.factories import UserFactory
from communications.factories import CommunicationFactory
from communications.models import CommunicationDirection
from core.testing import GraphQLTestCase
from homes.factories import HomeFactory
from jobs.factories import JobFactory

COMMUNICATIONS = """
query($jobId: ID!, $needsReview: Boolean, $direction: CommunicationDirection) {
  communications(jobId: $jobId, needsReview: $needsReview, direction: $direction) {
    id subject direction needsReview
  }
}
"""
UPDATE = """
mutation($communicationId: ID!, $needsReview: Boolean!) {
  updateCommunication(communicationId: $communicationId, needsReview: $needsReview) {
    communication { id needsReview }
  }
}
"""


class CommunicationsTests(GraphQLTestCase):
    """query communications / mutation updateCommunication"""

    def setUp(self):
        """Creates a job with one sent and one received message."""
        super().setUp()
        self.user = UserFactory()
        self.other = UserFactory()
        self.job = JobFactory(home=HomeFactory(owner=self.user), created_by=self.user)
        self.sent = CommunicationFactory(
            job=self.job, direction=CommunicationDirection.SENT, needs_review=False
        )
        self.received = CommunicationFactory(
            job=self.job, direction=CommunicationDirection.RECEIVED, needs_review=True
        )

    def test_lists_every_message_on_the_job(self):
        """Both directions come back when no filter is given."""
        data = self.assert_ok(
            self.execute(COMMUNICATIONS, {"jobId": self.job.pk}, token=self.token_for(self.user))
        )
        self.assertEqual(len(data["communications"]), 2)

    def test_filters_by_direction(self):
        """The direction filter narrows the list."""
        body = self.execute(
            COMMUNICATIONS, {"jobId": self.job.pk, "direction": "RECEIVED"}, token=self.token_for(self.user)
        )
        data = self.assert_ok(body)
        self.assertEqual([c["id"] for c in data["communications"]], [str(self.received.pk)])

    def test_filters_by_needs_review(self):
        """The needsReview filter distinguishes true from false rather than treating false as absent."""
        body = self.execute(
            COMMUNICATIONS, {"jobId": self.job.pk, "needsReview": False}, token=self.token_for(self.user)
        )
        data = self.assert_ok(body)
        self.assertEqual([c["id"] for c in data["communications"]], [str(self.sent.pk)])

    def test_is_forbidden_for_a_stranger(self):
        """Someone outside the home cannot read the job's messages."""
        body = self.execute(COMMUNICATIONS, {"jobId": self.job.pk}, token=self.token_for(self.other))
        self.assert_error_code(body, "FORBIDDEN")

    def test_marks_a_message_reviewed(self):
        """Clearing needsReview takes the message off the review list."""
        body = self.execute(
            UPDATE,
            {"communicationId": self.received.pk, "needsReview": False},
            token=self.token_for(self.user),
        )
        self.assertFalse(self.assert_ok(body)["updateCommunication"]["communication"]["needsReview"])

    def test_stranger_cannot_update_a_message(self):
        """Updating a message on someone else's job is FORBIDDEN."""
        body = self.execute(
            UPDATE,
            {"communicationId": self.received.pk, "needsReview": False},
            token=self.token_for(self.other),
        )
        self.assert_error_code(body, "FORBIDDEN")
