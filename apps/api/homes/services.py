"""Home creation, membership and deletion.

Creating a home makes the caller its OWNER and warms the permission cache so the
next read does not have to re-check membership.
"""

from typing import Any

from core import permissions
from core.errors import ForbiddenError, NotFoundError
from homes.models import Home, HomeRole, UserHome


def create_home(user_id: str, data: dict[str, Any]) -> Home:
    """Creates a home owned by the user and grants them access."""
    home = Home.objects.create(
        name=data["name"],
        address1=data["address1"],
        address2=data.get("address2"),
        city=data["city"],
        state=data["state"],
        zip_code=data["zip_code"],
        country=data.get("country") or "US",
        notes=data.get("notes"),
    )
    UserHome.objects.create(user_id=user_id, home=home, role=HomeRole.OWNER)
    permissions.grant(user_id, home.pk)
    return home


def update_home(home_id: str, data: dict[str, Any]) -> Home:
    """Applies the given field updates to the home."""
    home = Home.objects.get_or_404(pk=home_id)
    for field, value in data.items():
        if value is not None:
            setattr(home, field, value)
    home.save()
    return home


def delete_home(home_id: str, user_id: str) -> None:
    """Deletes the home. Only an OWNER may do this."""
    membership = UserHome.objects.find_membership(user_id, home_id)
    if not membership or membership.role != HomeRole.OWNER:
        raise ForbiddenError("Only owners can delete homes")
    Home.objects.filter(pk=home_id).delete()
    permissions.invalidate(user_id, home_id)


def add_user_to_home(home_id: str, email: str, role: str) -> UserHome:
    """Adds the user with this email to the home, or updates their role if already a member."""
    from accounts.models import User

    target = User.objects.find_by_email(email)
    if not target:
        raise NotFoundError("User")
    membership = UserHome.objects.upsert(target.pk, home_id, role)
    permissions.grant(target.pk, home_id)
    return membership


def remove_user_from_home(home_id: str, target_user_id: str) -> None:
    """Removes the user's membership of the home."""
    UserHome.objects.filter(user_id=target_user_id, home_id=home_id).delete()
    permissions.invalidate(target_user_id, home_id)
