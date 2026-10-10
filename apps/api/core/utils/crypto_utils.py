"""AES-256-GCM encryption for OAuth tokens at rest.

Byte-compatible with the Node implementation it replaces: the ciphertext is
`iv (16 bytes) || authTag (16 bytes) || ciphertext`, base64-encoded, keyed by the
32-character ENCRYPTION_KEY. Tokens encrypted by the Express API decrypt here.
"""

import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from django.conf import settings

IV_LENGTH = 16
AUTH_TAG_LENGTH = 16


def _key() -> bytes:
    """Returns the 32-byte encryption key, raising when it is missing or the wrong length."""
    key = settings.ENCRYPTION_KEY.encode()
    if len(key) != 32:
        raise RuntimeError("ENCRYPTION_KEY must be exactly 32 characters")
    return key


def encrypt(plaintext: str) -> str:
    """Returns the base64 `iv || authTag || ciphertext` envelope for the plaintext."""
    iv = os.urandom(IV_LENGTH)
    sealed = AESGCM(_key()).encrypt(iv, plaintext.encode(), None)
    ciphertext, auth_tag = sealed[:-AUTH_TAG_LENGTH], sealed[-AUTH_TAG_LENGTH:]
    return base64.b64encode(iv + auth_tag + ciphertext).decode()


def decrypt(ciphertext: str) -> str:
    """Returns the plaintext for a base64 `iv || authTag || ciphertext` envelope."""
    raw = base64.b64decode(ciphertext)
    iv = raw[:IV_LENGTH]
    auth_tag = raw[IV_LENGTH : IV_LENGTH + AUTH_TAG_LENGTH]
    body = raw[IV_LENGTH + AUTH_TAG_LENGTH :]
    return AESGCM(_key()).decrypt(iv, body + auth_tag, None).decode()
