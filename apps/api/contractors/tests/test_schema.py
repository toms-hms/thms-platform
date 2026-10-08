"""The contractors GraphQL surface, including the admin-only write gates."""

from accounts.factories import AdminFactory, UserFactory
from contractors.factories import ContractorFactory
from contractors.models import Contractor, TradeCategory
from core.testing import GraphQLTestCase
from quotes.factories import QuoteFactory

CONTRACTORS = """
query($search: String, $tradeCategories: [TradeCategory!], $zipCodes: [String!]) {
  contractors(search: $search, tradeCategories: $tradeCategories, zipCodes: $zipCodes) {
    id name categories zipCodes
  }
}
"""
CREATE = """
mutation($name: String!, $categories: [TradeCategory!]!, $zipCodes: [String!]) {
  createContractor(name: $name, categories: $categories, zipCodes: $zipCodes) {
    contractor { id name categories zipCodes isGlobal }
  }
}
"""
DELETE = "mutation($contractorId: ID!) { deleteContractor(contractorId: $contractorId) { success } }"


class ContractorsQueryTests(GraphQLTestCase):
    """query contractors"""

    def setUp(self):
        """Creates a user and one global plumber."""
        super().setUp()
        self.user = UserFactory()
        self.contractor = ContractorFactory(categories=[TradeCategory.PLUMBING], zip_codes=["78701"])

    def test_lists_the_directory(self):
        """Any authenticated user can read the global directory."""
        data = self.assert_ok(self.execute(CONTRACTORS, token=self.token_for(self.user)))
        self.assertEqual(data["contractors"][0]["id"], str(self.contractor.pk))
        self.assertEqual(data["contractors"][0]["zipCodes"], ["78701"])

    def test_filters_by_trade_category(self):
        """The tradeCategories filter narrows the list."""
        body = self.execute(CONTRACTORS, {"tradeCategories": ["HVAC"]}, token=self.token_for(self.user))
        self.assertEqual(self.assert_ok(body)["contractors"], [])

    def test_rejects_an_unknown_trade_category(self):
        """A value outside the enum is rejected by the schema."""
        body = self.execute(
            CONTRACTORS, {"tradeCategories": ["NOT_A_TRADE"]}, token=self.token_for(self.user)
        )
        self.assertTrue(body.get("errors"))

    def test_requires_a_token(self):
        """Reading the directory without a token is UNAUTHORIZED."""
        self.assert_error_code(self.execute(CONTRACTORS), "UNAUTHORIZED")


class ContractorMutationTests(GraphQLTestCase):
    """mutation createContractor / deleteContractor"""

    def test_admin_can_create(self):
        """An admin creates a global contractor with its service area."""
        body = self.execute(
            CREATE,
            {"name": "New Co", "categories": ["HVAC"], "zipCodes": ["78704"]},
            token=self.token_for(AdminFactory()),
        )
        contractor = self.assert_ok(body)["createContractor"]["contractor"]
        self.assertTrue(contractor["isGlobal"])
        self.assertEqual(contractor["zipCodes"], ["78704"])

    def test_non_admin_is_forbidden(self):
        """A regular user may not create contractors."""
        body = self.execute(
            CREATE, {"name": "Nope", "categories": ["HVAC"]}, token=self.token_for(UserFactory())
        )
        self.assert_error_code(body, "FORBIDDEN")

    def test_non_admin_may_not_delete(self):
        """A regular user may not delete contractors."""
        contractor = ContractorFactory()
        body = self.execute(DELETE, {"contractorId": contractor.pk}, token=self.token_for(UserFactory()))
        self.assert_error_code(body, "FORBIDDEN")
        self.assertTrue(Contractor.objects.filter(pk=contractor.pk).exists())

    def test_admin_can_delete(self):
        """An admin deletes a contractor."""
        contractor = ContractorFactory()
        body = self.execute(DELETE, {"contractorId": contractor.pk}, token=self.token_for(AdminFactory()))
        self.assertTrue(self.assert_ok(body)["deleteContractor"]["success"])
        self.assertFalse(Contractor.objects.filter(pk=contractor.pk).exists())

    def test_deleting_a_contractor_with_quotes_is_a_conflict(self):
        """Quotes protect their contractor; the delete is refused with CONFLICT and nothing is removed."""
        quote = QuoteFactory()
        body = self.execute(
            DELETE, {"contractorId": quote.contractor_id}, token=self.token_for(AdminFactory())
        )
        self.assert_error_code(body, "CONFLICT")
        self.assertTrue(Contractor.objects.filter(pk=quote.contractor_id).exists())

    def test_a_malformed_id_is_not_found(self):
        """An id that is not a UUID is NOT_FOUND, not an internal error."""
        body = self.execute(DELETE, {"contractorId": "not-a-uuid"}, token=self.token_for(AdminFactory()))
        self.assert_error_code(body, "NOT_FOUND")
