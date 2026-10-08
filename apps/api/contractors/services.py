"""Writes against the contractor directory. All of these are admin-only paths."""

from typing import Any

from django.db.models import ProtectedError

from contractors.models import Contractor
from core.errors import ConflictError


def create_contractor(data: dict[str, Any]) -> Contractor:
    """Creates a global contractor with its service-area ZIP codes."""
    return Contractor.objects.create_with_zip_codes(
        zip_codes=data.get("zip_codes") or [],
        name=data["name"],
        company_name=data.get("company_name"),
        email=data.get("email"),
        phone=data.get("phone"),
        categories=data["categories"],
        notes=data.get("notes"),
        is_global=True,
    )


def update_contractor(contractor_id: str, data: dict[str, Any]) -> Contractor:
    """Updates the contractor's fields, replacing its ZIP codes when they are supplied."""
    fields = {key: value for key, value in data.items() if key != "zip_codes" and value is not None}
    return Contractor.objects.update_with_zip_codes(contractor_id, zip_codes=data.get("zip_codes"), **fields)


def promote_contractor(contractor_id: str) -> Contractor:
    """Makes a private contractor visible in the global directory."""
    return Contractor.objects.promote(contractor_id)


def delete_contractor(contractor_id: str) -> None:
    """Deletes the contractor. Raises NotFoundError when absent, ConflictError while quotes reference it."""
    try:
        Contractor.objects.get_or_404(pk=contractor_id).delete()
    except ProtectedError as err:
        raise ConflictError("Contractor has quotes and cannot be deleted") from err
