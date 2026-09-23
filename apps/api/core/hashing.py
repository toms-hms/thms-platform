"""Password hashing compatible with the bcrypt hashes already in the database.

The Express API stored raw bcrypt hashes (`$2a$12$...`) produced by bcryptjs.
Django normally prefixes its own algorithm label, which those rows do not have,
so the hasher below reads and writes the raw bcrypt format — existing passwords
keep working and rows written here stay readable by anything else on the table.
"""

import bcrypt
from django.conf import settings
from django.contrib.auth.hashers import BasePasswordHasher

RAW_BCRYPT_PREFIXES = ("$2a$", "$2b$", "$2x$", "$2y$")

# bcrypt only reads the first 72 bytes of its input. bcryptjs truncated silently;
# the Python library raises instead, so truncate explicitly to keep hashes written
# by either implementation interchangeable. Refresh tokens exceed this length.
BCRYPT_MAX_BYTES = 72


def _prepare(password: str) -> bytes:
    """Returns the password encoded and truncated to the length bcrypt actually reads."""
    return password.encode()[:BCRYPT_MAX_BYTES]


def hash_password(password: str, rounds: int | None = None) -> str:
    """Returns a raw bcrypt hash of the password at the configured cost."""
    cost = rounds if rounds is not None else settings.BCRYPT_ROUNDS
    return bcrypt.hashpw(_prepare(password), bcrypt.gensalt(cost)).decode()


def verify_password(password: str, hashed: str | None) -> bool:
    """Returns True when the password matches the raw bcrypt hash; False for empty or malformed hashes."""
    if not hashed or not hashed.startswith(RAW_BCRYPT_PREFIXES):
        return False
    try:
        return bcrypt.checkpw(_prepare(password), hashed.encode())
    except ValueError:
        return False


class BcryptRawPasswordHasher(BasePasswordHasher):
    """Django hasher that stores bare bcrypt hashes, without Django's `algorithm$` prefix."""

    algorithm = "bcrypt_raw"

    def salt(self) -> str:
        """Returns a bcrypt salt at the configured cost."""
        return bcrypt.gensalt(settings.BCRYPT_ROUNDS).decode()

    def encode(self, password: str, salt: str) -> str:
        """Returns the raw bcrypt hash of the password with the given salt."""
        return bcrypt.hashpw(_prepare(password), salt.encode()).decode()

    def verify(self, password: str, encoded: str) -> bool:
        """Returns True when the password matches the stored raw bcrypt hash."""
        return verify_password(password, encoded)

    def safe_summary(self, encoded: str) -> dict[str, str]:
        """Returns a redacted summary of the hash for Django's admin/debug output."""
        return {"algorithm": self.algorithm, "hash": f"{encoded[:7]}..."}

    def harden_runtime(self, password: str, encoded: str) -> None:
        """No-op — bcrypt's cost factor already provides constant work per verification."""
        return None
