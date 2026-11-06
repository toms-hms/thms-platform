"""Who belongs to a home, and in what role.

Every change to a membership invalidates that member's cached role, so the next
permission check re-reads the database.
"""

from accounts.models import User
from accounts.models.user.manager import UserManager
from core.errors import BadRequestError, NotFoundError
from core.services.permission_service import PermissionService
from core.utils.email_utils import normalize_email
from homes.models import UserHome
from homes.models.user_home.manager import UserHomeManager


class UserHomeService:
    """Adds members to homes, changes their role, and removes them."""

    def __init__(
        self,
        *,
        permission_service: PermissionService | None = None,
        user_home_manager: UserHomeManager | None = None,
        user_manager: UserManager | None = None,
    ) -> None:
        self._permission_service = permission_service or PermissionService()
        self._user_home_manager = user_home_manager or UserHome.objects
        self._user_manager = user_manager or User.objects

    def create(
        self, *, home_id: str, role: str, user_id: str | None = None, email: str | None = None
    ) -> UserHome:
        """Makes the user a member of the home with the role, or changes the role if they already are.

        The user is given by id or by email address. Raises NotFoundError when no account has the
        email, BadRequestError when neither is given.
        """
        if user_id is None:
            if email is None:
                raise BadRequestError("Either userId or email is required")
            user = self._user_manager.find(email=normalize_email(email))
            if user is None:
                raise NotFoundError("User")
            user_id = user.pk
        membership = self._user_home_manager.upsert(home_id=home_id, user_id=user_id, role=role)
        self._permission_service.invalidate(home_id=home_id, user_id=user_id)
        return membership

    def delete(self, *, home_id: str, user_id: str) -> None:
        """Removes the user's membership of the home."""
        self._user_home_manager.remove(home_id=home_id, user_id=user_id)
        self._permission_service.invalidate(home_id=home_id, user_id=user_id)
