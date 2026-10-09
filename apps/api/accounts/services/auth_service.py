"""Registration, login and token rotation.

Login returns an access token and a refresh token. The SHA-256 digest of the
current refresh token is stored on the user row, so only the most recently issued
refresh token is accepted and logging out revokes it.
"""

from typing import Any

from accounts.models import User
from core.errors import ConflictError, UnauthorizedError
from core.utils.hashing_utils import hash_token, verify_token
from core.utils.jwt_utils import sign_access_token, sign_refresh_token, verify_refresh_token


class AuthService:
    """Issues, rotates and revokes the token pair."""

    def _issue_tokens(self, *, user: User) -> dict[str, str]:
        """Returns a fresh token pair and stores the refresh token's digest."""
        access_token = sign_access_token(user.pk, user.email, user.role)
        refresh_token = sign_refresh_token(user.pk)
        User.objects.apply_updates(user, refresh_token_hash=hash_token(refresh_token))
        return {"access_token": access_token, "refresh_token": refresh_token}

    def register(self, *, email: str, password: str, first_name: str, last_name: str) -> dict[str, Any]:
        """Creates a user and returns them with a fresh token pair. Rejects an email already in use."""
        if User.objects.find_by_email(email):
            raise ConflictError("Email already registered")
        user = User.objects.create_user(email, password, first_name=first_name, last_name=last_name)
        return {"user": user, "tokens": self._issue_tokens(user=user)}

    def login(self, *, email: str, password: str) -> dict[str, Any]:
        """Returns the user and a fresh token pair, or raises UnauthorizedError for bad credentials."""
        user = User.objects.find_by_email(email)
        if not user or not user.check_password(password):
            raise UnauthorizedError("Invalid credentials")
        return {"user": user, "tokens": self._issue_tokens(user=user)}

    def refresh(self, *, refresh_token: str) -> dict[str, Any]:
        """Exchanges the current refresh token for a new pair; any earlier token is rejected."""
        claims = verify_refresh_token(refresh_token)
        user = User.objects.find_by_id(claims.get("sub"))
        if not user or not verify_token(refresh_token, user.refresh_token_hash):
            raise UnauthorizedError("Invalid refresh token")
        return {"user": user, "tokens": self._issue_tokens(user=user)}

    def logout(self, *, user_id: str) -> None:
        """Revokes the user's refresh token."""
        User.objects.apply_updates(User.objects.get_or_404(pk=user_id), refresh_token_hash=None)
