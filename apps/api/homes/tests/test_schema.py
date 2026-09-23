"""The homes GraphQL surface: auth gates and the happy path."""

from accounts.factories import UserFactory
from core.testing import GraphQLTestCase
from homes.factories import HomeFactory

HOMES = "query { homes { id name fullAddress } }"
HOME = "query($homeId: ID!) { home(homeId: $homeId) { id name } }"
CREATE_HOME = """
mutation($name: String!, $address1: String!, $city: String!, $state: String!, $zipCode: String!) {
  createHome(name: $name, address1: $address1, city: $city, state: $state, zipCode: $zipCode) {
    home { id name fullAddress }
  }
}
"""
UPDATE_HOME = """
mutation($homeId: ID!, $name: String!) {
  updateHome(homeId: $homeId, name: $name) { home { id name } }
}
"""


class HomesQueryTests(GraphQLTestCase):
    """query homes / home"""

    def setUp(self):
        """Creates a member, a stranger and one home."""
        super().setUp()
        self.user = UserFactory()
        self.other = UserFactory()
        self.home = HomeFactory(owner=self.user)

    def test_lists_only_the_callers_homes(self):
        """The list contains the caller's home and excludes other people's."""
        data = self.assert_ok(self.execute(HOMES, token=self.token_for(self.user)))
        self.assertEqual([h["id"] for h in data["homes"]], [self.home.pk])

    def test_stranger_sees_no_homes(self):
        """A user with no memberships gets an empty list."""
        data = self.assert_ok(self.execute(HOMES, token=self.token_for(self.other)))
        self.assertEqual(data["homes"], [])

    def test_requires_a_token(self):
        """Listing homes without a token is UNAUTHORIZED."""
        self.assert_error_code(self.execute(HOMES), "UNAUTHORIZED")

    def test_single_home_is_forbidden_for_a_non_member(self):
        """Reading someone else's home is FORBIDDEN."""
        body = self.execute(HOME, {"homeId": self.home.pk}, token=self.token_for(self.other))
        self.assert_error_code(body, "FORBIDDEN")


class HomeMutationTests(GraphQLTestCase):
    """mutation createHome / updateHome"""

    def setUp(self):
        """Creates the acting user."""
        super().setUp()
        self.user = UserFactory()

    def test_creates_a_home(self):
        """A home is created and returned with its full address."""
        body = self.execute(
            CREATE_HOME,
            {"name": "New Home", "address1": "2 Oak", "city": "Austin", "state": "TX", "zipCode": "78702"},
            token=self.token_for(self.user),
        )
        home = self.assert_ok(body)["createHome"]["home"]
        self.assertEqual(home["name"], "New Home")
        self.assertIn("Austin", home["fullAddress"])

    def test_update_is_forbidden_for_a_non_member(self):
        """Updating a home the caller cannot access is FORBIDDEN."""
        home = HomeFactory(owner=UserFactory())
        body = self.execute(
            UPDATE_HOME, {"homeId": home.pk, "name": "Hacked"}, token=self.token_for(self.user)
        )
        self.assert_error_code(body, "FORBIDDEN")
