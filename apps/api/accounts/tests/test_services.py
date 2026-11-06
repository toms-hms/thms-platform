"""Registration, login and token rotation."""

from django.test import TestCase

from accounts.factories import TEST_PASSWORD, UserFactory
from accounts.models import User
from accounts.services.auth_service import AuthService
from core.errors import ConflictError, UnauthorizedError


class RegisterTests(TestCase):
    """AuthService.register()"""

    def test_creates_user_and_issues_tokens(self):
        """A new email registers and comes back with a usable token pair."""
        result = AuthService().register(
            email="new@example.com", first_name="New", last_name="User", password="password123"
        )
        self.assertEqual(result["user"].email, "new@example.com")
        self.assertTrue(result["tokens"]["access_token"])
        self.assertTrue(result["tokens"]["refresh_token"])

    def test_stores_a_hashed_password(self):
        """The password is stored through Django's hasher, never as plaintext."""
        AuthService().register(
            email="hash@example.com", first_name="A", last_name="B", password="password123"
        )
        user = User.objects.get(email="hash@example.com")
        self.assertNotIn("password123", user.password)
        self.assertTrue(user.check_password("password123"))

    def test_stores_the_email_normalized(self):
        """The address is trimmed and lower-cased before it is stored."""
        result = AuthService().register(
            email="  Pat@Example.COM ", first_name="Pat", last_name="B", password="password123"
        )
        self.assertEqual(result["user"].email, "pat@example.com")

    def test_rejects_an_email_that_differs_only_in_case(self):
        """`Taken@Example.com` is the same account as `taken@example.com`."""
        UserFactory(email="taken@example.com")
        with self.assertRaises(ConflictError):
            AuthService().register(
                email="Taken@Example.com", first_name="A", last_name="B", password="password123"
            )

    def test_rejects_duplicate_email(self):
        """Registering an email that already exists is a conflict."""
        UserFactory(email="taken@example.com")
        with self.assertRaises(ConflictError):
            AuthService().register(
                email="taken@example.com", first_name="A", last_name="B", password="password123"
            )


class LoginTests(TestCase):
    """AuthService.login()"""

    def test_returns_tokens_for_valid_credentials(self):
        """Correct credentials return the user and a token pair."""
        user = UserFactory()
        result = AuthService().login(email=user.email, password=TEST_PASSWORD)
        self.assertEqual(result["user"].pk, user.pk)
        self.assertTrue(result["tokens"]["access_token"])

    def test_matches_the_email_regardless_of_case(self):
        """Signing in with different capitalisation finds the same account."""
        user = UserFactory(email="pat@example.com")
        result = AuthService().login(email="Pat@Example.com", password=TEST_PASSWORD)
        self.assertEqual(result["user"].pk, user.pk)

    def test_rejects_wrong_password(self):
        """A wrong password is rejected without revealing whether the account exists."""
        user = UserFactory()
        with self.assertRaises(UnauthorizedError):
            AuthService().login(email=user.email, password="wrong-password")

    def test_rejects_unknown_email(self):
        """An unknown email is rejected the same way as a wrong password."""
        with self.assertRaises(UnauthorizedError):
            AuthService().login(email="nobody@example.com", password=TEST_PASSWORD)


class RefreshTokenTests(TestCase):
    """AuthService.refresh() and logout()"""

    def test_rotates_a_valid_refresh_token(self):
        """A valid refresh token yields a new pair."""
        user = UserFactory()
        tokens = AuthService().login(email=user.email, password=TEST_PASSWORD)["tokens"]
        rotated = AuthService().refresh(refresh_token=tokens["refresh_token"])
        self.assertTrue(rotated["tokens"]["access_token"])

    def test_rejects_a_garbage_token(self):
        """A token that does not verify is rejected."""
        with self.assertRaises(UnauthorizedError):
            AuthService().refresh(refresh_token="not-a-token")

    def test_logout_revokes_the_refresh_token(self):
        """After logout the previously issued refresh token no longer works."""
        user = UserFactory()
        tokens = AuthService().login(email=user.email, password=TEST_PASSWORD)["tokens"]
        AuthService().logout(user=user)
        with self.assertRaises(UnauthorizedError):
            AuthService().refresh(refresh_token=tokens["refresh_token"])

    def test_a_rotated_refresh_token_cannot_be_reused(self):
        """Only the most recently issued refresh token is accepted; the one it replaced is rejected."""
        user = UserFactory()
        first = AuthService().login(email=user.email, password=TEST_PASSWORD)["tokens"]["refresh_token"]
        second = AuthService().refresh(refresh_token=first)["tokens"]["refresh_token"]
        self.assertNotEqual(first, second)
        with self.assertRaises(UnauthorizedError):
            AuthService().refresh(refresh_token=first)
        self.assertTrue(AuthService().refresh(refresh_token=second)["tokens"]["refresh_token"])


class CheckPasswordTests(TestCase):
    """UserManager.check_password()"""

    def test_accepts_the_right_password_and_rejects_others(self):
        """The stored hash matches the password it was made from and nothing else."""
        user = UserFactory()
        self.assertTrue(User.objects.check_password(user, TEST_PASSWORD))
        self.assertFalse(User.objects.check_password(user, "wrong-password"))
