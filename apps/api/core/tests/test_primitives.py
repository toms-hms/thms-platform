"""Identifiers, encryption and token signing."""

from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase

from core.crypto import decrypt, encrypt
from core.errors import UnauthorizedError
from core.hashing import hash_password, verify_password
from core.ids import create_id
from core.jwt_utils import parse_duration, sign_access_token, sign_refresh_token, verify_access_token


class CreateIdTests(TestCase):
    """create_id()"""

    def test_matches_the_cuid2_shape(self):
        """Ids are 24 characters, start with a letter and are lowercase base36."""
        value = create_id()
        self.assertEqual(len(value), 24)
        self.assertTrue(value[0].isalpha() and value[0].islower())
        self.assertTrue(all(c.isdigit() or ("a" <= c <= "z") for c in value))

    def test_is_unique_across_many_calls(self):
        """Ten thousand ids do not collide."""
        self.assertEqual(len({create_id() for _ in range(10_000)}), 10_000)


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


class PasswordTests(TestCase):
    """hash_password() / verify_password()"""

    def test_verifies_its_own_hash(self):
        """A hash this code produces verifies against the original password."""
        self.assertTrue(verify_password("hunter22", hash_password("hunter22", rounds=4)))

    def test_rejects_the_wrong_password(self):
        """A different password does not verify."""
        self.assertFalse(verify_password("wrong", hash_password("hunter22", rounds=4)))

    def test_handles_input_longer_than_bcrypt_reads(self):
        """A value longer than 72 bytes (such as a JWT) hashes and verifies rather than raising."""
        long_value = "x" * 400
        self.assertTrue(verify_password(long_value, hash_password(long_value, rounds=4)))

    def test_rejects_a_missing_or_malformed_hash(self):
        """An empty or non-bcrypt hash never verifies."""
        self.assertFalse(verify_password("anything", None))
        self.assertFalse(verify_password("anything", "not-a-bcrypt-hash"))


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
        with patch("core.jwt_utils.parse_duration", return_value=timedelta(seconds=-10)):
            token = sign_access_token("user-1", "a@b.test", "USER")
        with self.assertRaises(UnauthorizedError):
            verify_access_token(token)

    def test_parses_node_style_durations(self):
        """Durations are read in the same format the Node config used."""
        self.assertEqual(parse_duration("15m"), timedelta(minutes=15))
        self.assertEqual(parse_duration("7d"), timedelta(days=7))
        self.assertEqual(parse_duration("3600"), timedelta(seconds=3600))
