"""The accounts GraphQL surface."""

from accounts.factories import TEST_PASSWORD, UserFactory
from core.testing import GraphQLTestCase

LOGIN = """
mutation Login($email: String!, $password: String!) {
  login(email: $email, password: $password) {
    user { id email role }
    tokens { accessToken refreshToken }
  }
}
"""

ME = "query { me { id email firstName lastName role } }"

REGISTER = """
mutation Register($email: String!, $password: String!, $firstName: String!, $lastName: String!) {
  register(email: $email, password: $password, firstName: $firstName, lastName: $lastName) {
    user { id email }
    tokens { accessToken }
  }
}
"""


class LoginMutationTests(GraphQLTestCase):
    """mutation login"""

    def test_returns_user_and_tokens(self):
        """Valid credentials return the user with an access token."""
        user = UserFactory()
        body = self.execute(LOGIN, {"email": user.email, "password": TEST_PASSWORD})
        data = self.assert_ok(body)["login"]
        self.assertEqual(data["user"]["email"], user.email)
        self.assertTrue(data["tokens"]["accessToken"])

    def test_rejects_bad_credentials_with_unauthorized_code(self):
        """A wrong password comes back as UNAUTHORIZED."""
        user = UserFactory()
        body = self.execute(LOGIN, {"email": user.email, "password": "nope"})
        self.assert_error_code(body, "UNAUTHORIZED")


class RegisterMutationTests(GraphQLTestCase):
    """mutation register"""

    def test_creates_the_account(self):
        """Registration returns the new user and a token."""
        body = self.execute(
            REGISTER,
            {"email": "gql@example.com", "password": "password123", "firstName": "G", "lastName": "Q"},
        )
        data = self.assert_ok(body)["register"]
        self.assertEqual(data["user"]["email"], "gql@example.com")

    def test_duplicate_email_is_a_conflict(self):
        """Registering an existing email comes back as CONFLICT."""
        UserFactory(email="dupe@example.com")
        body = self.execute(
            REGISTER,
            {"email": "dupe@example.com", "password": "password123", "firstName": "G", "lastName": "Q"},
        )
        self.assert_error_code(body, "CONFLICT")


class MeQueryTests(GraphQLTestCase):
    """query me"""

    def test_returns_the_authenticated_user(self):
        """A valid token resolves to that user's own record."""
        user = UserFactory()
        body = self.execute(ME, token=self.token_for(user))
        self.assertEqual(self.assert_ok(body)["me"]["email"], user.email)

    def test_requires_a_token(self):
        """Without a token the query is UNAUTHORIZED."""
        self.assert_error_code(self.execute(ME), "UNAUTHORIZED")

    def test_rejects_a_forged_token(self):
        """A token that fails signature verification is UNAUTHORIZED."""
        self.assert_error_code(self.execute(ME, token="not.a.token"), "UNAUTHORIZED")
