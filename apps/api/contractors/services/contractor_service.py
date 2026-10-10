"""The contractor directory: creating, editing, promoting and removing contractors.

A contractor is global (in the shared directory, admin-managed) or private (created
from a user's rolodex). Its service area is the set of ZIP codes it serves.
"""

from django.db import transaction
from django.db.models import ProtectedError

from contractors.models import Contractor, ContractorZipCode
from core.errors import ConflictError
from core.utils.unset_utils import UNSET, Unset


class ContractorService:
    """Writes to the contractor directory and its service areas."""

    @transaction.atomic
    def create(
        self,
        *,
        name: str,
        categories: list[str],
        is_global: bool,
        company_name: str | None = None,
        email: str | None = None,
        phone: str | None = None,
        zip_codes: list[str] | None = None,
        notes: str | None = None,
    ) -> Contractor:
        """Creates the contractor and its service area in one transaction."""
        contractor = Contractor.objects.create(
            name=name,
            categories=categories,
            is_global=is_global,
            company_name=company_name,
            email=email,
            phone=phone,
            notes=notes,
        )
        self._replace_zip_codes(contractor=contractor, zip_codes=zip_codes or [])
        return contractor

    @transaction.atomic
    def update(
        self,
        *,
        contractor_id: str,
        name: str | Unset = UNSET,
        categories: list[str] | Unset = UNSET,
        company_name: str | None | Unset = UNSET,
        email: str | None | Unset = UNSET,
        phone: str | None | Unset = UNSET,
        zip_codes: list[str] | None | Unset = UNSET,
        notes: str | None | Unset = UNSET,
    ) -> Contractor:
        """Applies the provided fields. zip_codes replaces the whole service area; None clears it."""
        contractor = Contractor.objects.get_or_404(pk=contractor_id)
        Contractor.objects.apply_updates(
            contractor,
            name=name,
            categories=categories,
            company_name=company_name,
            email=email,
            phone=phone,
            notes=notes,
        )
        if zip_codes is not UNSET:
            self._replace_zip_codes(contractor=contractor, zip_codes=zip_codes or [])
        return contractor

    def promote(self, *, contractor_id: str) -> Contractor:
        """Moves a private contractor into the global directory."""
        return Contractor.objects.apply_updates(
            Contractor.objects.get_or_404(pk=contractor_id), is_global=True
        )

    def delete(self, *, contractor_id: str) -> None:
        """Deletes the contractor. Raises ConflictError while quotes reference it."""
        try:
            Contractor.objects.get_or_404(pk=contractor_id).delete()
        except ProtectedError as err:
            raise ConflictError("Contractor has quotes and cannot be deleted") from err

    def _replace_zip_codes(self, *, contractor: Contractor, zip_codes: list[str]) -> None:
        """Replaces the contractor's service area with exactly these ZIP codes."""
        ContractorZipCode.objects.filter_contractor_ids([contractor.pk]).delete()
        ContractorZipCode.objects.bulk_create(
            [ContractorZipCode(contractor=contractor, zip_code=zip_code) for zip_code in zip_codes]
        )
