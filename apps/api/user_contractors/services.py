"""Adding and removing entries in a user's contractor rolodex."""

from typing import Any

from contractors.models import Contractor
from core.errors import BadRequestError, ConflictError, NotFoundError
from user_contractors.models import UserContractor


def create_user_contractor(user_id: str, data: dict[str, Any]) -> UserContractor:
    """Saves a contractor to the user's rolodex, creating a private contractor when no id is given."""
    contractor_id = data.get("contractor_id")

    if not contractor_id:
        if not data.get("name"):
            raise BadRequestError("Either contractorId or name is required")
        contractor = Contractor.objects.create_with_zip_codes(
            zip_codes=data.get("zip_codes") or [],
            name=data["name"],
            company_name=data.get("company_name"),
            email=data.get("email"),
            phone=data.get("phone"),
            categories=data.get("categories") or [],
            notes=data.get("notes"),
            is_global=False,
        )
        contractor_id = contractor.pk
    else:
        Contractor.objects.get_or_404(pk=contractor_id)

    if UserContractor.objects.filter_existing(user_id, contractor_id):
        raise ConflictError("Contractor already in your rolodex")

    return UserContractor.objects.create(user_id=user_id, contractor_id=contractor_id, note=data.get("note"))


def delete_user_contractor(user_id: str, user_contractor_id: str) -> None:
    """Removes an entry from the user's rolodex, verifying ownership first."""
    entry = UserContractor.objects.filter(pk=user_contractor_id).first()
    if not entry or entry.user_id != user_id:
        raise NotFoundError("User contractor")
    entry.delete()
