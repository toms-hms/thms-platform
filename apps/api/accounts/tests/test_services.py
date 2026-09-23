"""Registration, login and token rotation."""

from django.test import TestCase

from accounts import services
from accounts.factories import TEST_PASSWORD, UserFactory
from accounts.models import User
from core.errors import ConflictError, UnauthorizedError
from core.hashing import hash_password, verify_password


class RegisterTests(TestCase):
    """register()"""

    def test_creates_user_and_issues_tokens(self):
        """A new email registers and comes back with a usable token pair."""
        result = services.register(
            email="new@example.com", password="password123", first_name="New", last_name="User"
        )
        self.assertEqual(result["user"].email, "new@example.com")
        self.assertTrue(result["tokens"]["access_token"])
        self.assertTrue(result["tokens"]["refresh_token"])

    def test_stores_password_as_bcrypt_hash(self):
        """The stored hash is raw bcrypt, not the plaintext and not Django's prefixed format."""
        services.register(email="hash@example.com", password="password123", first_name="A", last_name="B")
        user = User.objects.get(email="hash@example.com")
        self.assertTrue(user.password.startswith("$2"))
        self.assertTrue(verify_password("password123", user.password))

    def test_rejects_duplicate_email(self):
        """Registering an email that already exists is a conflict."""
        UserFactory(email="taken@example.com")
        with self.assertRaises(ConflictError):
            services.register(
                email="taken@example.com", password="password123", first_name="A", last_name="B"
            )


class LoginTests(TestCase):
    """login()"""

    def test_returns_tokens_for_valid_credentials(self):
        """Correct credentials return the user and a token pair."""
        user = UserFactory()
        result = services.login(email=user.email, password=TEST_PASSWORD)
        self.assertEqual(result["user"].pk, user.pk)
        self.assertTrue(result["tokens"]["access_token"])

    def test_rejects_wrong_password(self):
        """A wrong password is rejected without revealing whether the account exists."""
        user = UserFactory()
        with self.assertRaises(UnauthorizedError):
            services.login(email=user.email, password="wrong-password")

    def test_rejects_unknown_email(self):
        """An unknown email is rejected the same way as a wrong password."""
        with self.assertRaises(UnauthorizedError):
            services.login(email="nobody@example.com", password=TEST_PASSWORD)

    def test_accepts_hash_written_by_the_previous_api(self):
        """A bcrypt hash in the format bcryptjs wrote still authenticates."""
        user = UserFactory(password=hash_password("legacy-password", rounds=4))
        result = services.login(email=user.email, password="legacy-password")
        self.assertEqual(result["user"].pk, user.pk)


class RefreshTokenTests(TestCase):
    """refresh_tokens() and logout()"""

    def test_rotates_a_valid_refresh_token(self):
        """A valid refresh token yields a new pair."""
        user = UserFactory()
        tokens = services.login(email=user.email, password=TEST_PASSWORD)["tokens"]
        rotated = services.refresh_tokens(tokens["refresh_token"])
        self.assertTrue(rotated["tokens"]["access_token"])

    def test_rejects_a_garbage_token(self):
        """A token that does not verify is rejected."""
        with self.assertRaises(UnauthorizedError):
            services.refresh_tokens("not-a-token")

    def test_logout_revokes_the_refresh_token(self):
        """After logout the previously issued refresh token no longer works."""
        user = UserFactory()
        tokens = services.login(email=user.email, password=TEST_PASSWORD)["tokens"]
        services.logout(user.pk)
        with self.assertRaises(UnauthorizedError):
            services.refresh_tokens(tokens["refresh_token"])
