"""Homes.

Deleting a home drops every member's cached role, so the next permission check
re-reads the database. Membership itself is `UserHomeService`.
"""

from core.errors import NotFoundError
from core.services.permission_service import PermissionService
from core.utils.unset_utils import UNSET, Unset
from homes.models import Home, HomeRole, UserHome
from homes.services.user_home_service import UserHomeService


class HomeService:
    """Creates, edits and deletes homes."""

    def __init__(self, *, user_homes: UserHomeService | None = None) -> None:
        self._user_homes = user_homes or UserHomeService()

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
        self._user_homes.create(home_id=home.pk, user_id=user_id, role=HomeRole.OWNER)
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
        home = Home.objects.find(pk=home_id)
        if home is None:
            raise NotFoundError("Home")
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
        home = Home.objects.find(pk=home_id)
        if home is None:
            raise NotFoundError("Home")
        member_ids = UserHome.objects.member_ids(home_id=home_id)
        home.delete()
        for member_id in member_ids:
            PermissionService().invalidate(user_id=member_id, home_id=home_id)
