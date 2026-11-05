"""The user table."""

from django.contrib.auth.base_user import AbstractBaseUser
from django.db import models

from accounts.models.user.manager import UserManager
from core.models import BaseModel


class UserRole(models.TextChoices):
    """Platform-wide role. ADMIN sees every home, job and contractor."""

    ADMIN = "ADMIN", "Admin"
    USER = "USER", "User"


class User(BaseModel, AbstractBaseUser):
    """A person with access to the platform."""

    email = models.TextField(unique=True)
    password = models.TextField()
    first_name = models.TextField()
    last_name = models.TextField()
    role = models.CharField(max_length=32, choices=UserRole.choices, default=UserRole.USER)
    refresh_token_hash = models.TextField(null=True, blank=True)

    # The table has no last_login column and nothing writes one.
    last_login = None

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()
