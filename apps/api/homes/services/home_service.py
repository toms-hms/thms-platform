"""Homes.

Deleting a home drops every member's cached role, so the next permission check
re-reads the database. Membership itself is `UserHomeService`.
"""

from core.errors import NotFoundError
from core.services.permission_service import PermissionService
from core.utils.unset_utils import UNSET, Unset
from homes.models import Home, HomeRole, UserHome
from homes.models.home.manager import HomeManager
from homes.models.user_home.manager import UserHomeManager
from homes.services.user_home_service import UserHomeService


class HomeService:
    """Creates, edits and deletes homes."""

    def __init__(
        self,
        *,
        home_manager: HomeManager | None = None,
        permission_service: PermissionService | None = None,
        user_home_manager: UserHomeManager | None = None,
        user_home_service: UserHomeService | None = None,
    ) -> None:
        self._home_manager = home_manager or Home.objects
        self._permission_service = permission_service or PermissionService()
        self._user_home_manager = user_home_manager or UserHome.objects
        self._user_home_service = user_home_service or UserHomeService()

    def create(
        self,
        *,
        user_id: str,
        address1: str,
        city: str,
        name: str,
        state: str,
        zip_code: str,
        address2: str | None = None,
        country: str | None = None,
        notes: str | None = None,
    ) -> Home:
        """Creates a home owned by the user."""
        home = self._home_manager.create(
            address1=address1,
            address2=address2,
            city=city,
            country=country or "US",
            name=name,
            notes=notes,
            state=state,
            zip_code=zip_code,
        )
        self._user_home_service.create(home_id=home.pk, role=HomeRole.OWNER, user_id=user_id)
        return home

    def update(
        self,
        *,
        home_id: str,
        address1: str | Unset = UNSET,
        address2: str | None | Unset = UNSET,
        city: str | Unset = UNSET,
        name: str | Unset = UNSET,
        notes: str | None | Unset = UNSET,
        state: str | Unset = UNSET,
        zip_code: str | Unset = UNSET,
    ) -> Home:
        """Applies the provided fields. UNSET leaves a field alone; None clears a nullable one."""
        home = self._home_manager.find(pk=home_id)
        if home is None:
            raise NotFoundError("Home")
        return self._home_manager.apply_updates(
            home,
            address1=address1,
            address2=address2,
            city=city,
            name=name,
            notes=notes,
            state=state,
            zip_code=zip_code,
        )

    def delete(self, *, home_id: str) -> None:
        """Deletes the home and drops every member's cached role. The caller has already checked access."""
        home = self._home_manager.find(pk=home_id)
        if home is None:
            raise NotFoundError("Home")
        member_ids = self._user_home_manager.member_ids(home_id=home_id)
        self._home_manager.delete(home)
        for member_id in member_ids:
            self._permission_service.invalidate(home_id=home_id, user_id=member_id)
