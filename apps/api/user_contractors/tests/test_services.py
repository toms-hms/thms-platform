"""Rolodex writes."""

from django.test import TestCase

from accounts.factories import UserFactory
from contractors.factories import ContractorFactory
from contractors.models import Contractor, TradeCategory
from core.errors import BadRequestError, ConflictError, NotFoundError
from user_contractors import services
from user_contractors.factories import UserContractorFactory
from user_contractors.models import UserContractor


class CreateUserContractorTests(TestCase):
    """create_user_contractor()"""

    def test_saves_an_existing_contractor(self):
        """Referencing an existing contractor links it to the user."""
        user, contractor = UserFactory(), ContractorFactory()
        entry = services.create_user_contractor(user.pk, {"contractor_id": contractor.pk, "note": "good"})
        self.assertEqual(entry.contractor_id, contractor.pk)
        self.assertEqual(entry.note, "good")

    def test_creates_a_private_contractor_when_given_a_name(self):
        """Supplying a name creates a contractor that stays out of the global directory."""
        user = UserFactory()
        entry = services.create_user_contractor(
            user.pk,
            {"name": "Bob's Plumbing", "categories": [TradeCategory.PLUMBING], "zip_codes": ["78701"]},
        )
        contractor = Contractor.objects.get(pk=entry.contractor_id)
        self.assertFalse(contractor.is_global)
        self.assertEqual(contractor.zip_codes, ["78701"])

    def test_requires_an_id_or_a_name(self):
        """Neither a contractor id nor a name is a bad request."""
        with self.assertRaises(BadRequestError):
            services.create_user_contractor(UserFactory().pk, {"note": "orphan"})

    def test_rejects_a_duplicate_entry(self):
        """The same contractor cannot be saved to a rolodex twice."""
        entry = UserContractorFactory()
        with self.assertRaises(ConflictError):
            services.create_user_contractor(entry.user_id, {"contractor_id": entry.contractor_id})

    def test_unknown_contractor_is_not_found(self):
        """Referencing a contractor that does not exist raises NotFoundError."""
        with self.assertRaises(NotFoundError):
            services.create_user_contractor(UserFactory().pk, {"contractor_id": "missing"})


class DeleteUserContractorTests(TestCase):
    """delete_user_contractor()"""

    def test_owner_may_delete(self):
        """The owner removes their own entry."""
        entry = UserContractorFactory()
        services.delete_user_contractor(entry.user_id, entry.pk)
        self.assertFalse(UserContractor.objects.filter(pk=entry.pk).exists())

    def test_another_user_may_not_delete(self):
        """Someone else's entry is not visible, so deleting it is NotFoundError."""
        entry = UserContractorFactory()
        with self.assertRaises(NotFoundError):
            services.delete_user_contractor(UserFactory().pk, entry.pk)
