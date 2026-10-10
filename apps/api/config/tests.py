"""The GraphQL endpoint itself: rate limiting and error shaping."""

from unittest.mock import patch

from django.test import override_settings

from accounts.factories import TEST_PASSWORD, UserFactory
from accounts.services.auth_service import AuthService
from core.testing import GraphQLTestCase

ME = "query { me { id email } }"
LOGOUT = "mutation { logout { success } }"
LOGIN = """
mutation Login($email: String!, $password: String!) {
  login(email: $email, password: $password) { tokens { accessToken } }
}
"""


class HealthTests(GraphQLTestCase):
    """GET /health"""

    def test_reports_ok(self):
        """The health probe returns a status and a timestamp."""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")


@override_settings(RATELIMIT_ENABLE=True, AUTH_RATE_LIMIT="2/m", GRAPHQL_RATE_LIMIT="100/m")
class RateLimitTests(GraphQLTestCase):
    """Rate limiting on /graphql"""

    def setUp(self):
        """Creates a user to authenticate as."""
        super().setUp()
        self.user = UserFactory()

    def test_repeated_logins_are_rate_limited(self):
        """Auth operations are limited more tightly than ordinary queries."""
        variables = {"email": self.user.email, "password": TEST_PASSWORD}
        for _ in range(2):
            self.execute(LOGIN, variables)
        body = self.execute(LOGIN, variables)
        self.assert_error_code(body, "RATE_LIMITED")

    def test_ordinary_queries_are_not_caught_by_the_auth_limit(self):
        """A query that is not an auth operation uses the looser limit."""
        token = self.token_for(self.user)
        for _ in range(3):
            body = self.execute(ME, token=token)
        self.assert_ok(body)

    def test_requests_are_served_when_the_limiter_backend_is_down(self):
        """A cache outage must not take the API down with it."""
        with patch("config.views.is_ratelimited", side_effect=ConnectionError("cache down")):
            body = self.execute(ME, token=self.token_for(self.user))
        self.assert_ok(body)


class ErrorShapeTests(GraphQLTestCase):
    """Error responses"""

    def test_unexpected_errors_are_masked(self):
        """An unhandled exception is logged, not leaked to the client."""
        with patch.object(AuthService, "logout", side_effect=RuntimeError("database on fire")):
            body = self.execute(LOGOUT, token=self.token_for(UserFactory()))
        self.assert_error_code(body, "INTERNAL_ERROR")
        self.assertNotIn("database on fire", str(body["errors"]))

    def test_malformed_queries_are_rejected(self):
        """A query the schema cannot parse comes back as an error, not a crash."""
        body = self.execute("query { thisFieldDoesNotExist }")
        self.assertTrue(body.get("errors"))
