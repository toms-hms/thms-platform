"""The homes GraphQL surface: auth gates and the happy path."""

from accounts.factories import AdminFactory, UserFactory
from core.testing import GraphQLTestCase
from homes.factories import HomeFactory
from homes.models import Home, HomeRole, UserHome

HOMES = "query { homes { id name fullAddress } }"
HOME = "query($homeId: ID!) { home(homeId: $homeId) { id name } }"
CREATE_HOME = """
mutation($name: String!, $address1: String!, $city: String!, $state: String!, $zipCode: String!) {
  createHome(name: $name, address1: $address1, city: $city, state: $state, zipCode: $zipCode) {
    home { id name fullAddress }
  }
}
"""
DELETE_HOME = """
mutation($homeId: ID!) {
  deleteHome(homeId: $homeId) { success }
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
        self.assertEqual([h["id"] for h in data["homes"]], [str(self.home.pk)])

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


class HomeAuthorizationTests(GraphQLTestCase):
    """@authorize on the home surface"""

    def setUp(self):
        """Creates an owner and a member of one home."""
        super().setUp()
        self.owner, self.member = UserFactory(), UserFactory()
        self.home = HomeFactory(owner=self.owner)
        UserHome.objects.upsert(self.member.pk, self.home.pk, HomeRole.MEMBER)

    def test_member_may_not_delete_the_home(self):
        """MEMBER lacks HOME_DELETE, so deleting is FORBIDDEN and the home survives."""
        body = self.execute(DELETE_HOME, {"homeId": self.home.pk}, token=self.token_for(self.member))
        self.assert_error_code(body, "FORBIDDEN")
        self.assertTrue(Home.objects.filter(pk=self.home.pk).exists())

    def test_owner_may_delete_the_home(self):
        """OWNER holds HOME_DELETE."""
        body = self.execute(DELETE_HOME, {"homeId": self.home.pk}, token=self.token_for(self.owner))
        self.assertTrue(self.assert_ok(body)["deleteHome"]["success"])

    def test_admin_may_read_a_home_they_do_not_belong_to(self):
        """ADMIN is allowed every permission without membership."""
        body = self.execute(HOME, {"homeId": self.home.pk}, token=self.token_for(AdminFactory()))
        self.assertEqual(self.assert_ok(body)["home"]["id"], str(self.home.pk))

    def test_an_unknown_home_is_forbidden(self):
        """A home that does not exist is indistinguishable from one the caller cannot see."""
        body = self.execute(HOME, {"homeId": "does-not-exist"}, token=self.token_for(self.owner))
        self.assert_error_code(body, "FORBIDDEN")
