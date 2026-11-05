"""Registration, login and token rotation.

Login returns an access token and a refresh token. The SHA-256 digest of the
current refresh token is stored on the user row, so only the most recently issued
refresh token is accepted and logging out revokes it.
"""

from typing import Any

from django.contrib.auth.hashers import make_password

from accounts.models import User
from accounts.models.user.manager import UserManager
from core.errors import ConflictError, UnauthorizedError
from core.utils.email_utils import normalize_email
from core.utils.hashing_utils import hash_token, verify_token
from core.utils.jwt_utils import sign_access_token, sign_refresh_token, verify_refresh_token


class AuthService:
    """Issues, rotates and revokes the token pair."""

    def __init__(self, *, user_manager: UserManager | None = None) -> None:
        self._user_manager = user_manager or User.objects

    def _issue_tokens(self, *, user: User) -> dict[str, str]:
        """Returns a fresh token pair and stores the refresh token's digest."""
        access_token = sign_access_token(user.pk, user.email, user.role)
        refresh_token = sign_refresh_token(user.pk)
        self._user_manager.apply_updates(user, refresh_token_hash=hash_token(refresh_token))
        return {"access_token": access_token, "refresh_token": refresh_token}

    def register(self, *, email: str, password: str, first_name: str, last_name: str) -> dict[str, Any]:
        """Creates a user and returns them with a fresh token pair. Rejects an email already in use."""
        email = normalize_email(email)
        if self._user_manager.find(email=email):
            raise ConflictError("Email already registered")
        user = self._user_manager.create(
            email=email, password=make_password(password), first_name=first_name, last_name=last_name
        )
        return {"user": user, "tokens": self._issue_tokens(user=user)}

    def login(self, *, email: str, password: str) -> dict[str, Any]:
        """Returns the user and a fresh token pair, or raises UnauthorizedError for bad credentials."""
        user = self._user_manager.find(email=normalize_email(email))
        if not user or not self._user_manager.check_password(user, password):
            raise UnauthorizedError("Invalid credentials")
        return {"user": user, "tokens": self._issue_tokens(user=user)}

    def refresh(self, *, refresh_token: str) -> dict[str, Any]:
        """Exchanges the current refresh token for a new pair; any earlier token is rejected."""
        claims = verify_refresh_token(refresh_token)
        user = self._user_manager.find(pk=claims.get("sub"))
        if not user or not verify_token(refresh_token, user.refresh_token_hash):
            raise UnauthorizedError("Invalid refresh token")
        return {"user": user, "tokens": self._issue_tokens(user=user)}

    def logout(self, *, user: User) -> None:
        """Revokes the user's refresh token. Takes the authenticated user, which the request has already loaded."""
        self._user_manager.apply_updates(user, refresh_token_hash=None)
