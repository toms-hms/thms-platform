"""Rolodex writes."""

from django.test import TestCase

from accounts.factories import UserFactory
from contractors.factories import ContractorFactory
from contractors.models import Contractor, TradeCategory
from core.errors import BadRequestError, ConflictError, NotFoundError
from user_contractors.factories import UserContractorFactory
from user_contractors.models import UserContractor
from user_contractors.services.user_contractor_service import UserContractorService


class CreateUserContractorTests(TestCase):
    """UserContractorService.add()"""

    def test_saves_an_existing_contractor(self):
        """Referencing an existing contractor links it to the user."""
        user, contractor = UserFactory(), ContractorFactory()
        entry = UserContractorService().add(user_id=user.pk, contractor_id=contractor.pk, note="good")
        self.assertEqual(entry.contractor_id, contractor.pk)
        self.assertEqual(entry.note, "good")

    def test_creates_a_private_contractor_when_given_a_name(self):
        """Supplying a name creates a contractor that stays out of the global directory."""
        user = UserFactory()
        entry = UserContractorService().add(
            user_id=user.pk, name="Bob's Plumbing", categories=[TradeCategory.PLUMBING], zip_codes=["78701"]
        )
        contractor = Contractor.objects.get(pk=entry.contractor_id)
        self.assertFalse(contractor.is_global)
        self.assertEqual(contractor.zip_codes, ["78701"])

    def test_requires_an_id_or_a_name(self):
        """Neither a contractor id nor a name is a bad request."""
        with self.assertRaises(BadRequestError):
            UserContractorService().add(user_id=UserFactory().pk, note="orphan")

    def test_rejects_a_duplicate_entry(self):
        """The same contractor cannot be saved to a rolodex twice."""
        entry = UserContractorFactory()
        with self.assertRaises(ConflictError):
            UserContractorService().add(user_id=entry.user_id, contractor_id=entry.contractor_id)

    def test_unknown_contractor_is_not_found(self):
        """Referencing a contractor that does not exist raises NotFoundError."""
        with self.assertRaises(NotFoundError):
            UserContractorService().add(user_id=UserFactory().pk, contractor_id="missing")


class DeleteUserContractorTests(TestCase):
    """UserContractorService.remove()"""

    def test_deletes_the_entry(self):
        """The entry is removed. Ownership is checked by the resolver's @owner_required."""
        entry = UserContractorFactory()
        UserContractorService().remove(user_contractor_id=entry.pk)
        self.assertFalse(UserContractor.objects.filter(pk=entry.pk).exists())

    def test_an_unknown_entry_is_not_found(self):
        """Deleting an id that does not exist raises NotFoundError."""
        with self.assertRaises(NotFoundError):
            UserContractorService().remove(user_contractor_id="missing")
