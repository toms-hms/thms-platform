"""The user table."""

import uuid

from django.contrib.auth.base_user import AbstractBaseUser
from django.db import models
from django.utils import timezone

from accounts.models.user.manager import UserManager


class UserRole(models.TextChoices):
    """Platform-wide role. ADMIN sees every home, job and contractor."""

    ADMIN = "ADMIN", "Admin"
    USER = "USER", "User"


class User(AbstractBaseUser):
    """A person with access to the platform."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.TextField(unique=True)
    password = models.TextField()
    first_name = models.TextField()
    last_name = models.TextField()
    role = models.CharField(max_length=32, choices=UserRole.choices, default=UserRole.USER)
    refresh_token_hash = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    # The table has no last_login column and nothing writes one.
    last_login = None

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self) -> str:
        return self.email

    @property
    def is_admin(self) -> bool:
        """Returns True when the user holds the ADMIN role."""
        return self.role == UserRole.ADMIN
