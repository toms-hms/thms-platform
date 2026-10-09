"""The quotes GraphQL surface."""

from accounts.factories import UserFactory
from core.testing import GraphQLTestCase
from homes.factories import HomeFactory
from jobs.factories import JobFactory
from quotes.factories import QuoteFactory
from quotes.models import Quote

QUOTES = "query($jobId: ID!) { quotes(jobId: $jobId) { id amount status contractor { id } } }"
CREATE = """
mutation($jobId: ID!, $contractorId: ID!, $amount: Float!) {
  createQuote(jobId: $jobId, contractorId: $contractorId, amount: $amount) { quote { id amount status } }
}
"""
UPDATE = """
mutation($quoteId: ID!, $status: QuoteStatus!) {
  updateQuote(quoteId: $quoteId, status: $status) { quote { id status } }
}
"""
PATCH = """
mutation($quoteId: ID!, $amount: Float, $description: String) {
  updateQuote(quoteId: $quoteId, amount: $amount, description: $description) { quote { amount description } }
}
"""
DELETE = "mutation($quoteId: ID!) { deleteQuote(quoteId: $quoteId) { success } }"


class QuotesTests(GraphQLTestCase):
    """query quotes / quote mutations"""

    def setUp(self):
        """Creates a job owned by one user, with one quote on it."""
        super().setUp()
        self.user = UserFactory()
        self.other = UserFactory()
        self.job = JobFactory(home=HomeFactory(owner=self.user), created_by=self.user)
        self.quote = QuoteFactory(job=self.job)

    def test_lists_quotes_for_a_visible_job(self):
        """The owner sees the quotes on their job."""
        data = self.assert_ok(self.execute(QUOTES, {"jobId": self.job.pk}, token=self.token_for(self.user)))
        self.assertEqual(data["quotes"][0]["id"], str(self.quote.pk))

    def test_is_forbidden_for_a_stranger(self):
        """Someone outside the home cannot read the job's quotes."""
        body = self.execute(QUOTES, {"jobId": self.job.pk}, token=self.token_for(self.other))
        self.assert_error_code(body, "FORBIDDEN")

    def test_creates_a_quote(self):
        """A quote is recorded against the job in DRAFT."""
        body = self.execute(
            CREATE,
            {"jobId": self.job.pk, "contractorId": self.quote.contractor_id, "amount": 2500.0},
            token=self.token_for(self.user),
        )
        quote = self.assert_ok(body)["createQuote"]["quote"]
        self.assertEqual(quote["amount"], 2500.0)
        self.assertEqual(quote["status"], "DRAFT")

    def test_stranger_cannot_create_a_quote(self):
        """Creating a quote on someone else's job is FORBIDDEN."""
        body = self.execute(
            CREATE,
            {"jobId": self.job.pk, "contractorId": self.quote.contractor_id, "amount": 1.0},
            token=self.token_for(self.other),
        )
        self.assert_error_code(body, "FORBIDDEN")

    def test_confirms_a_quote(self):
        """A quote can be moved to CONFIRMED."""
        body = self.execute(
            UPDATE, {"quoteId": self.quote.pk, "status": "CONFIRMED"}, token=self.token_for(self.user)
        )
        self.assertEqual(self.assert_ok(body)["updateQuote"]["quote"]["status"], "CONFIRMED")

    def test_deletes_a_quote(self):
        """A quote on a visible job can be deleted."""
        body = self.execute(DELETE, {"quoteId": self.quote.pk}, token=self.token_for(self.user))
        self.assertTrue(self.assert_ok(body)["deleteQuote"]["success"])
        self.assertFalse(Quote.objects.filter(pk=self.quote.pk).exists())


class QuotePartialUpdateTests(GraphQLTestCase):
    """updateQuote: omitted vs null"""

    def setUp(self):
        """Creates a quote with an amount and description on the user's job."""
        super().setUp()
        self.user = UserFactory()
        job = JobFactory(home=HomeFactory(owner=self.user), created_by=self.user)
        self.quote = QuoteFactory(job=job, amount=100, description="Original")

    def test_an_omitted_argument_leaves_the_field_alone(self):
        """Sending only amount keeps the description."""
        body = self.execute(PATCH, {"quoteId": self.quote.pk, "amount": 250}, token=self.token_for(self.user))
        quote = self.assert_ok(body)["updateQuote"]["quote"]
        self.assertEqual((quote["amount"], quote["description"]), (250.0, "Original"))

    def test_an_explicit_null_clears_a_nullable_field(self):
        """description: null clears the description."""
        body = self.execute(
            PATCH, {"quoteId": self.quote.pk, "description": None}, token=self.token_for(self.user)
        )
        self.assertIsNone(self.assert_ok(body)["updateQuote"]["quote"]["description"])

    def test_an_explicit_null_on_a_required_field_is_a_validation_error(self):
        """amount: null is refused and nothing changes."""
        body = self.execute(
            PATCH, {"quoteId": self.quote.pk, "amount": None}, token=self.token_for(self.user)
        )
        self.assert_error_code(body, "VALIDATION_ERROR")
        self.assertEqual(Quote.objects.get(pk=self.quote.pk).amount, 100)
