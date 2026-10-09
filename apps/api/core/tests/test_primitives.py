"""Encryption, token hashing and token signing."""

from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase

from core.errors import UnauthorizedError
from core.utils.crypto_utils import decrypt, encrypt
from core.utils.hashing_utils import hash_token, verify_token
from core.utils.jwt_utils import parse_duration, sign_access_token, sign_refresh_token, verify_access_token


class CryptoTests(TestCase):
    """encrypt() / decrypt()"""

    def test_round_trips_a_value(self):
        """A value survives an encrypt/decrypt round trip."""
        self.assertEqual(decrypt(encrypt("ya29.secret-token")), "ya29.secret-token")

    def test_ciphertext_hides_the_plaintext(self):
        """The stored form contains none of the plaintext."""
        self.assertNotIn("secret", encrypt("secret"))

    def test_each_encryption_uses_a_fresh_iv(self):
        """Encrypting the same value twice produces different ciphertext."""
        self.assertNotEqual(encrypt("same"), encrypt("same"))


class TokenHashTests(TestCase):
    """hash_token() / verify_token()"""

    def test_verifies_its_own_digest(self):
        """A digest this code produces verifies against the original token."""
        self.assertTrue(verify_token("eyJ.token", hash_token("eyJ.token")))

    def test_rejects_a_different_token(self):
        """A different token does not verify."""
        self.assertFalse(verify_token("eyJ.other", hash_token("eyJ.token")))

    def test_distinguishes_tokens_beyond_72_bytes(self):
        """Tokens sharing a long prefix (as JWTs for one user do) hash differently."""
        prefix = "x" * 200
        self.assertFalse(verify_token(prefix + "a", hash_token(prefix + "b")))

    def test_rejects_a_missing_digest(self):
        """No stored digest never verifies."""
        self.assertFalse(verify_token("anything", None))
        self.assertFalse(verify_token("anything", ""))


class JwtTests(TestCase):
    """Token signing and verification"""

    def test_access_token_carries_the_expected_claims(self):
        """The access token contains the user id, email and role."""
        claims = verify_access_token(sign_access_token("user-1", "a@b.test", "USER"))
        self.assertEqual(claims["sub"], "user-1")
        self.assertEqual(claims["email"], "a@b.test")
        self.assertEqual(claims["role"], "USER")

    def test_rejects_a_token_signed_with_the_refresh_secret(self):
        """A refresh token is not accepted where an access token is required."""
        with self.assertRaises(UnauthorizedError):
            verify_access_token(sign_refresh_token("user-1"))

    def test_rejects_an_expired_token(self):
        """An expired token is rejected."""
        with patch("core.utils.jwt_utils.parse_duration", return_value=timedelta(seconds=-10)):
            token = sign_access_token("user-1", "a@b.test", "USER")
        with self.assertRaises(UnauthorizedError):
            verify_access_token(token)

    def test_parses_node_style_durations(self):
        """Durations are read in the same format the Node config used."""
        self.assertEqual(parse_duration("15m"), timedelta(minutes=15))
        self.assertEqual(parse_duration("7d"), timedelta(days=7))
        self.assertEqual(parse_duration("3600"), timedelta(seconds=3600))
