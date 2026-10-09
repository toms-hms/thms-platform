"""A user's contractor rolodex."""

from contractors.models import Contractor
from contractors.services.contractor_service import ContractorService
from core.errors import BadRequestError, ConflictError
from user_contractors.models import UserContractor


class UserContractorService:
    """Adds contractors to, and removes them from, a user's rolodex."""

    def __init__(self, *, contractors: ContractorService | None = None) -> None:
        self.contractors = contractors or ContractorService()

    def add(
        self,
        *,
        user_id: str,
        contractor_id: str | None = None,
        note: str | None = None,
        name: str | None = None,
        company_name: str | None = None,
        email: str | None = None,
        phone: str | None = None,
        categories: list[str] | None = None,
        zip_codes: list[str] | None = None,
        notes: str | None = None,
    ) -> UserContractor:
        """Saves a contractor to the rolodex: an existing one by id, or a new private one from `name` and details.

        Raises BadRequestError when neither is given, ConflictError when it is already saved.
        """
        if contractor_id:
            Contractor.objects.get_or_404(pk=contractor_id)
        elif name:
            contractor_id = self.contractors.create(
                name=name,
                categories=categories or [],
                is_global=False,
                company_name=company_name,
                email=email,
                phone=phone,
                zip_codes=zip_codes,
                notes=notes,
            ).pk
        else:
            raise BadRequestError("Either contractorId or name is required")

        if UserContractor.objects.filter_existing(user_id=user_id, contractor_id=contractor_id):
            raise ConflictError("Contractor already in your rolodex")
        return UserContractor.objects.create(user_id=user_id, contractor_id=contractor_id, note=note)

    def remove(self, *, user_contractor_id: str) -> None:
        """Removes an entry from a rolodex. The caller has already checked ownership."""
        UserContractor.objects.get_or_404(pk=user_contractor_id).delete()
