"""Filter compositions and writes for the user table."""

from django.contrib.auth.base_user import BaseUserManager

from accounts.models.user.queryset import UserQuerySet
from core.managers import BaseManager


class UserManager(BaseUserManager.from_queryset(UserQuerySet), BaseManager):
    """Lookups and creation helpers for user accounts."""

    def find_by_email(self, email: str):
        """Returns the user with this email address, or None."""
        return self.filter(email=email).first()

    def find_by_id(self, user_id: str):
        """Returns the user with this id, or None."""
        return self.filter(pk=user_id).first()

    def create_user(self, email: str, password: str, **extra):
        """Creates a user with the password hashed by Django's configured hasher."""
        user = self.model(email=self.normalize_email(email), **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user
