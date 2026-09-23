"""The jobs GraphQL surface, including the nested job payload."""

from accounts.factories import UserFactory
from ai.factories import AIGenerationFactory, JobImageFactory
from communications.factories import CommunicationFactory
from core.testing import GraphQLTestCase
from homes.factories import HomeFactory
from jobs.factories import JobContractorFactory, JobFactory
from quotes.factories import QuoteFactory

JOB = """
query($jobId: ID!) {
  job(jobId: $jobId) {
    id title status category
    contractors { id status contractor { id name } }
    quotes { id amount }
    communications { id subject }
    aiGenerations { id provider }
    images { id kind }
  }
}
"""
JOBS = "query($homeId: ID) { jobs(homeId: $homeId) { id title } }"
CREATE_JOB = """
mutation($homeId: ID!, $title: String!, $category: TradeCategory!) {
  createJob(homeId: $homeId, title: $title, category: $category) { job { id title status } }
}
"""


class JobQueryTests(GraphQLTestCase):
    """query job / jobs"""

    def setUp(self):
        """Creates a job with one of everything hanging off it."""
        super().setUp()
        self.user = UserFactory()
        self.other = UserFactory()
        self.home = HomeFactory(owner=self.user)
        self.job = JobFactory(home=self.home, created_by=self.user)
        JobContractorFactory(job=self.job)
        QuoteFactory(job=self.job)
        CommunicationFactory(job=self.job)
        AIGenerationFactory(job=self.job)
        JobImageFactory(job=self.job)

    def test_returns_the_job_with_its_relations(self):
        """One query returns the job and everything attached to it."""
        data = self.assert_ok(self.execute(JOB, {"jobId": self.job.pk}, token=self.token_for(self.user)))
        job = data["job"]
        self.assertEqual(job["id"], self.job.pk)
        self.assertEqual(len(job["contractors"]), 1)
        self.assertEqual(len(job["quotes"]), 1)
        self.assertEqual(len(job["communications"]), 1)
        self.assertEqual(len(job["aiGenerations"]), 1)
        self.assertEqual(len(job["images"]), 1)

    def test_is_forbidden_for_a_stranger(self):
        """A user outside the home cannot read the job."""
        body = self.execute(JOB, {"jobId": self.job.pk}, token=self.token_for(self.other))
        self.assert_error_code(body, "FORBIDDEN")

    def test_requires_a_token(self):
        """Reading a job without a token is UNAUTHORIZED."""
        self.assert_error_code(self.execute(JOB, {"jobId": self.job.pk}), "UNAUTHORIZED")

    def test_listing_by_a_home_the_caller_cannot_see_is_forbidden(self):
        """Filtering by someone else's home is refused."""
        stranger_home = HomeFactory(owner=self.other)
        body = self.execute(JOBS, {"homeId": stranger_home.pk}, token=self.token_for(self.user))
        self.assert_error_code(body, "FORBIDDEN")


class CreateJobTests(GraphQLTestCase):
    """mutation createJob"""

    def test_creates_a_job_on_the_callers_home(self):
        """A member can create a job on their home."""
        user = UserFactory()
        home = HomeFactory(owner=user)
        body = self.execute(
            CREATE_JOB,
            {"homeId": home.pk, "title": "Fix sink", "category": "PLUMBING"},
            token=self.token_for(user),
        )
        job = self.assert_ok(body)["createJob"]["job"]
        self.assertEqual(job["title"], "Fix sink")
        self.assertEqual(job["status"], "DRAFT")

    def test_cannot_create_on_someone_elses_home(self):
        """Creating a job on a home the caller cannot access is FORBIDDEN."""
        home = HomeFactory(owner=UserFactory())
        body = self.execute(
            CREATE_JOB,
            {"homeId": home.pk, "title": "Sneaky", "category": "PLUMBING"},
            token=self.token_for(UserFactory()),
        )
        self.assert_error_code(body, "FORBIDDEN")
