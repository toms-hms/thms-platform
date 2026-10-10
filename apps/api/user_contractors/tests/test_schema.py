"""The rolodex GraphQL surface."""

from accounts.factories import UserFactory
from core.testing import GraphQLTestCase
from user_contractors.factories import UserContractorFactory

LIST = "query { userContractors { id note contractor { id name } } }"
DELETE = """
mutation($userContractorId: ID!) {
  deleteUserContractor(userContractorId: $userContractorId) { success }
}
"""


class UserContractorsTests(GraphQLTestCase):
    """query userContractors / mutation deleteUserContractor"""

    def setUp(self):
        """Creates one rolodex entry and an unrelated user."""
        super().setUp()
        self.entry = UserContractorFactory()
        self.other = UserFactory()

    def test_lists_the_callers_entries_with_the_contractor_attached(self):
        """The caller's own entries come back with contractor details."""
        data = self.assert_ok(self.execute(LIST, token=self.token_for(self.entry.user)))
        self.assertEqual(data["userContractors"][0]["contractor"]["id"], str(self.entry.contractor_id))

    def test_does_not_leak_other_users_entries(self):
        """Another user's rolodex is empty, not someone else's."""
        data = self.assert_ok(self.execute(LIST, token=self.token_for(self.other)))
        self.assertEqual(data["userContractors"], [])

    def test_deleting_someone_elses_entry_is_forbidden(self):
        """A stranger cannot delete an entry they do not own."""
        body = self.execute(DELETE, {"userContractorId": self.entry.pk}, token=self.token_for(self.other))
        self.assert_error_code(body, "FORBIDDEN")
