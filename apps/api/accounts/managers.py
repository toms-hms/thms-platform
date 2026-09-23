"""Query methods for users."""

from django.contrib.auth.base_user import BaseUserManager

from core.managers import BaseManager


class UserManager(BaseUserManager, BaseManager):
    """Lookups and creation helpers for user accounts."""

    def find_by_email(self, email: str):
        """Returns the user with this email address, or None."""
        return self.filter(email=email).first()

    def find_by_id(self, user_id: str):
        """Returns the user with this id, or None."""
        return self.filter(pk=user_id).first()

    def create_user(self, email: str, password: str, **extra):
        """Creates a user with a hashed password. Used by tests and management commands."""
        from core.hashing import hash_password

        user = self.model(email=self.normalize_email(email), password=hash_password(password), **extra)
        user.save(using=self._db)
        return user
