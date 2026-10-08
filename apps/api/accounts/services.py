"""Registration, login and token rotation.

Login returns an access token and a refresh token. The SHA-256 digest of the
current refresh token is stored on the user row, so only the most recently issued
refresh token is accepted and logging out revokes it.
"""

from typing import Any

from core.errors import ConflictError, NotFoundError, UnauthorizedError
from core.hashing import hash_token, verify_token
from core.jwt_utils import sign_access_token, sign_refresh_token, verify_refresh_token


def _issue_tokens(user) -> dict[str, str]:
    """Returns a fresh token pair for the user and stores the refresh token's hash."""
    access_token = sign_access_token(user.pk, user.email, user.role)
    refresh_token = sign_refresh_token(user.pk)
    user.refresh_token_hash = hash_token(refresh_token)
    user.save(update_fields=["refresh_token_hash", "updated_at"])
    return {"access_token": access_token, "refresh_token": refresh_token}


def register(*, email: str, password: str, first_name: str, last_name: str) -> dict[str, Any]:
    """Creates a user and returns them with a fresh token pair. Rejects an email already in use."""
    from accounts.models import User

    if User.objects.find_by_email(email):
        raise ConflictError("Email already registered")
    user = User.objects.create_user(email, password, first_name=first_name, last_name=last_name)
    return {"user": user, "tokens": _issue_tokens(user)}


def login(*, email: str, password: str) -> dict[str, Any]:
    """Returns the user and a fresh token pair, or raises UnauthorizedError for bad credentials."""
    from accounts.models import User

    user = User.objects.find_by_email(email)
    if not user or not user.check_password(password):
        raise UnauthorizedError("Invalid credentials")
    return {"user": user, "tokens": _issue_tokens(user)}


def refresh_tokens(refresh_token: str) -> dict[str, Any]:
    """Exchanges a valid refresh token for a new pair, rejecting tokens that no longer match the stored hash."""
    from accounts.models import User

    claims = verify_refresh_token(refresh_token)
    user = User.objects.find_by_id(claims.get("sub"))
    if not user or not user.refresh_token_hash:
        raise UnauthorizedError("Invalid refresh token")
    if not verify_token(refresh_token, user.refresh_token_hash):
        raise UnauthorizedError("Invalid refresh token")
    return {"user": user, "tokens": _issue_tokens(user)}


def logout(user_id: str) -> None:
    """Revokes the user's refresh token."""
    from accounts.models import User

    user = User.objects.find_by_id(user_id)
    if not user:
        raise NotFoundError("User")
    user.refresh_token_hash = None
    user.save(update_fields=["refresh_token_hash", "updated_at"])


def get_me(user_id: str):
    """Returns the user record for the authenticated caller."""
    from accounts.models import User

    user = User.objects.find_by_id(user_id)
    if not user:
        raise NotFoundError("User")
    return user
