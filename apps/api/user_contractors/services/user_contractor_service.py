"""A user's contractor rolodex."""

from contractors.models import Contractor
from contractors.models.contractor.manager import ContractorManager
from contractors.services.contractor_service import ContractorService
from core.errors import BadRequestError, ConflictError, NotFoundError
from user_contractors.models import UserContractor
from user_contractors.models.user_contractor.manager import UserContractorManager


class UserContractorService:
    """Adds contractors to, and removes them from, a user's rolodex."""

    def __init__(
        self,
        *,
        contractor_manager: ContractorManager | None = None,
        contractor_service: ContractorService | None = None,
        user_contractor_manager: UserContractorManager | None = None,
    ) -> None:
        self._contractor_manager = contractor_manager or Contractor.objects
        self._contractor_service = contractor_service or ContractorService()
        self._user_contractor_manager = user_contractor_manager or UserContractor.objects

    def create(
        self,
        *,
        user_id: str,
        contractor_id: str | None = None,
        categories: list[str] | None = None,
        company_name: str | None = None,
        email: str | None = None,
        name: str | None = None,
        note: str | None = None,
        notes: str | None = None,
        phone: str | None = None,
        zip_codes: list[str] | None = None,
    ) -> UserContractor:
        """Saves a contractor to the rolodex: an existing one by id, or a new private one from `name` and details.

        Raises BadRequestError when neither is given, ConflictError when it is already saved.
        """
        if contractor_id:
            if self._contractor_manager.find(pk=contractor_id) is None:
                raise NotFoundError("Contractor")
        elif name:
            contractor_id = self._contractor_service.create(
                categories=categories or [],
                is_global=False,
                name=name,
                company_name=company_name,
                email=email,
                notes=notes,
                phone=phone,
                zip_codes=zip_codes,
            ).pk
        else:
            raise BadRequestError("Either contractorId or name is required")

        if self._user_contractor_manager.filter_existing(contractor_id=contractor_id, user_id=user_id):
            raise ConflictError("Contractor already in your rolodex")
        return self._user_contractor_manager.create(contractor_id=contractor_id, user_id=user_id, note=note)

    def delete(self, *, user_contractor_id: str) -> None:
        """Removes an entry from a rolodex. The caller has already checked ownership."""
        user_contractor = self._user_contractor_manager.find(pk=user_contractor_id)
        if user_contractor is None:
            raise NotFoundError("UserContractor")
        self._user_contractor_manager.delete(user_contractor)
