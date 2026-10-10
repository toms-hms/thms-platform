"""Access and refresh token signing.

The token contract is unchanged from the Express API: an access token carrying
`{ sub, email, role }` signed with JWT_SECRET and a refresh token carrying
`{ sub }` signed with JWT_REFRESH_SECRET. Tokens issued before this service
existed still verify.
"""

import re
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from django.conf import settings

from core.errors import UnauthorizedError

_DURATION_UNITS = {"s": 1, "m": 60, "h": 3600, "d": 86400}


def parse_duration(value: str) -> timedelta:
    """Returns a timedelta for a Node-style duration string such as '15m', '7d' or '3600'."""
    match = re.fullmatch(r"(\d+)([smhd]?)", value.strip())
    if not match:
        raise ValueError(f"Invalid duration: {value}")
    amount, unit = match.groups()
    return timedelta(seconds=int(amount) * _DURATION_UNITS.get(unit, 1))


def _encode(payload: dict[str, Any], secret: str, expires_in: str) -> str:
    """Returns the payload signed with the secret and an exp claim derived from expires_in."""
    now = datetime.now(UTC)
    claims = {**payload, "jti": uuid.uuid4().hex, "iat": now, "exp": now + parse_duration(expires_in)}
    return jwt.encode(claims, secret, algorithm=settings.JWT_ALGORITHM)


def sign_access_token(user_id: str, email: str, role: str) -> str:
    """Returns a signed access token for the user."""
    return _encode(
        {"sub": str(user_id), "email": email, "role": role}, settings.JWT_SECRET, settings.JWT_EXPIRES_IN
    )


def sign_refresh_token(user_id: str) -> str:
    """Returns a signed refresh token for the user."""
    return _encode({"sub": str(user_id)}, settings.JWT_REFRESH_SECRET, settings.JWT_REFRESH_EXPIRES_IN)


def verify_access_token(token: str) -> dict[str, Any]:
    """Returns the decoded access-token claims, raising UnauthorizedError when invalid or expired."""
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except jwt.ExpiredSignatureError as err:
        raise UnauthorizedError("Token has expired") from err
    except jwt.PyJWTError as err:
        raise UnauthorizedError("Invalid or expired token") from err


def verify_refresh_token(token: str) -> dict[str, Any]:
    """Returns the decoded refresh-token claims, raising UnauthorizedError when invalid or expired."""
    try:
        return jwt.decode(token, settings.JWT_REFRESH_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except jwt.PyJWTError as err:
        raise UnauthorizedError("Invalid refresh token") from err
