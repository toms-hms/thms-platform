"""The contractor directory: creating, editing, promoting and removing contractors.

A contractor is global (in the shared directory, admin-managed) or private (created
from a user's rolodex). Its service area is the set of ZIP codes it serves.
"""

from django.db import transaction
from django.db.models import ProtectedError

from contractors.models import Contractor, ContractorZipCode
from contractors.models.contractor.manager import ContractorManager
from contractors.models.contractor_zip_code.manager import ContractorZipCodeManager
from core.errors import ConflictError, NotFoundError
from core.utils.unset_utils import UNSET, Unset


class ContractorService:
    """Writes to the contractor directory and its service areas."""

    def __init__(
        self,
        *,
        contractor_manager: ContractorManager | None = None,
        contractor_zip_code_manager: ContractorZipCodeManager | None = None,
    ) -> None:
        self._contractor_manager = contractor_manager or Contractor.objects
        self._contractor_zip_code_manager = contractor_zip_code_manager or ContractorZipCode.objects

    @transaction.atomic
    def create(
        self,
        *,
        categories: list[str],
        is_global: bool,
        name: str,
        company_name: str | None = None,
        email: str | None = None,
        notes: str | None = None,
        phone: str | None = None,
        zip_codes: list[str] | None = None,
    ) -> Contractor:
        """Creates the contractor and its service area in one transaction."""
        contractor = self._contractor_manager.create(
            categories=categories,
            company_name=company_name,
            email=email,
            is_global=is_global,
            name=name,
            notes=notes,
            phone=phone,
        )
        self._replace_zip_codes(contractor=contractor, zip_codes=zip_codes or [])
        return contractor

    @transaction.atomic
    def update(
        self,
        *,
        contractor_id: str,
        categories: list[str] | Unset = UNSET,
        company_name: str | None | Unset = UNSET,
        email: str | None | Unset = UNSET,
        name: str | Unset = UNSET,
        notes: str | None | Unset = UNSET,
        phone: str | None | Unset = UNSET,
        zip_codes: list[str] | None | Unset = UNSET,
    ) -> Contractor:
        """Applies the provided fields. zip_codes replaces the whole service area; None clears it."""
        contractor = self._contractor_manager.find(pk=contractor_id)
        if contractor is None:
            raise NotFoundError("Contractor")
        self._contractor_manager.apply_updates(
            contractor,
            categories=categories,
            company_name=company_name,
            email=email,
            name=name,
            notes=notes,
            phone=phone,
        )
        if zip_codes is not UNSET:
            self._replace_zip_codes(contractor=contractor, zip_codes=zip_codes or [])
        return contractor

    def promote(self, *, contractor_id: str) -> Contractor:
        """Moves a private contractor into the global directory."""
        contractor = self._contractor_manager.find(pk=contractor_id)
        if contractor is None:
            raise NotFoundError("Contractor")
        return self._contractor_manager.apply_updates(contractor, is_global=True)

    def delete(self, *, contractor_id: str) -> None:
        """Deletes the contractor. Raises ConflictError while quotes reference it."""
        try:
            contractor = self._contractor_manager.find(pk=contractor_id)
            if contractor is None:
                raise NotFoundError("Contractor")
            self._contractor_manager.delete(contractor)
        except ProtectedError as err:
            raise ConflictError("Contractor has quotes and cannot be deleted") from err

    def _replace_zip_codes(self, *, contractor: Contractor, zip_codes: list[str]) -> None:
        """Replaces the contractor's service area with exactly these ZIP codes."""
        self._contractor_zip_code_manager.replace_for_contractor(contractor=contractor, zip_codes=zip_codes)
