"""Hashing for high-entropy secrets such as refresh tokens.

Passwords do not go through here — they use Django's password hashers via
`User.set_password` / `User.check_password`. A refresh token is a long random
signed value, so a fast digest with a constant-time compare is the right tool;
a slow password hash would add cost without adding safety.
"""

import hashlib
import hmac


def hash_token(token: str) -> str:
    """Returns the SHA-256 hex digest of the token."""
    return hashlib.sha256(token.encode()).hexdigest()


def verify_token(token: str, hashed: str | None) -> bool:
    """Returns True when the token hashes to the stored digest; False when there is no digest."""
    if not hashed:
        return False
    return hmac.compare_digest(hash_token(token), hashed)
