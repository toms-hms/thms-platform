"""Home creation, membership and deletion.

Every change to a membership invalidates that member's cached role, so the next
permission check re-reads the database.
"""

from typing import Any

from core import permissions
from core.errors import NotFoundError
from homes.models import Home, HomeRole, UserHome


def create_home(user_id: str, data: dict[str, Any]) -> Home:
    """Creates a home owned by the user."""
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
    permissions.invalidate(user_id, home.pk)
    return home


def update_home(home_id: str, data: dict[str, Any]) -> Home:
    """Applies the given field updates to the home."""
    home = Home.objects.get_or_404(pk=home_id)
    for field, value in data.items():
        if value is not None:
            setattr(home, field, value)
    home.save()
    return home


def delete_home(home_id: str) -> None:
    """Deletes the home and drops every member's cached role. The caller has already checked access."""
    member_ids = list(UserHome.objects.filter_home_ids([home_id]).values_list("user_id", flat=True))
    Home.objects.filter_ids([home_id]).delete()
    for member_id in member_ids:
        permissions.invalidate(member_id, home_id)


def add_user_to_home(home_id: str, email: str, role: str) -> UserHome:
    """Adds the user with this email to the home, or updates their role if already a member."""
    from accounts.models import User

    target = User.objects.find_by_email(email)
    if not target:
        raise NotFoundError("User")
    membership = UserHome.objects.upsert(target.pk, home_id, role)
    permissions.invalidate(target.pk, home_id)
    return membership


def remove_user_from_home(home_id: str, target_user_id: str) -> None:
    """Removes the user's membership of the home."""
    UserHome.objects.filter(user_id=target_user_id, home_id=home_id).delete()
    permissions.invalidate(target_user_id, home_id)
