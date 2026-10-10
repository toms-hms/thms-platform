"""Homes and their membership.

Every change to a membership invalidates that member's cached role, so the next
permission check re-reads the database.
"""

from accounts.models import User
from core.errors import NotFoundError
from core.services.permission_service import PermissionService
from core.utils.unset_utils import UNSET, Unset
from homes.models import Home, HomeRole, UserHome


class HomeService:
    """Creates, edits and deletes homes, and manages who belongs to them."""

    def create(
        self,
        *,
        user_id: str,
        name: str,
        address1: str,
        city: str,
        state: str,
        zip_code: str,
        address2: str | None = None,
        country: str | None = None,
        notes: str | None = None,
    ) -> Home:
        """Creates a home owned by the user."""
        home = Home.objects.create(
            name=name,
            address1=address1,
            address2=address2,
            city=city,
            state=state,
            zip_code=zip_code,
            country=country or "US",
            notes=notes,
        )
        UserHome.objects.create(user_id=user_id, home=home, role=HomeRole.OWNER)
        PermissionService().invalidate(user_id=user_id, home_id=home.pk)
        return home

    def update(
        self,
        *,
        home_id: str,
        name: str | Unset = UNSET,
        address1: str | Unset = UNSET,
        address2: str | None | Unset = UNSET,
        city: str | Unset = UNSET,
        state: str | Unset = UNSET,
        zip_code: str | Unset = UNSET,
        notes: str | None | Unset = UNSET,
    ) -> Home:
        """Applies the provided fields. UNSET leaves a field alone; None clears a nullable one."""
        home = Home.objects.get_or_404(pk=home_id)
        return Home.objects.apply_updates(
            home,
            name=name,
            address1=address1,
            address2=address2,
            city=city,
            state=state,
            zip_code=zip_code,
            notes=notes,
        )

    def delete(self, *, home_id: str) -> None:
        """Deletes the home and drops every member's cached role. The caller has already checked access."""
        member_ids = list(UserHome.objects.filter_home_ids([home_id]).values_list("user_id", flat=True))
        Home.objects.filter_ids([home_id]).delete()
        for member_id in member_ids:
            PermissionService().invalidate(user_id=member_id, home_id=home_id)

    def add_member(self, *, home_id: str, email: str, role: str) -> UserHome:
        """Adds the user with this email to the home, or changes their role if already a member."""
        target = User.objects.find_by_email(email)
        if not target:
            raise NotFoundError("User")
        membership = UserHome.objects.upsert(user_id=target.pk, home_id=home_id, role=role)
        PermissionService().invalidate(user_id=target.pk, home_id=home_id)
        return membership

    def remove_member(self, *, home_id: str, user_id: str) -> None:
        """Removes the user's membership of the home."""
        UserHome.objects.filter_home_ids([home_id]).filter_user_ids([user_id]).delete()
        PermissionService().invalidate(user_id=user_id, home_id=home_id)
