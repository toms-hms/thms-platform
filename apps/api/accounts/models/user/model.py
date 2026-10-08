"""The user table."""

from django.contrib.auth.base_user import AbstractBaseUser
from django.db import models
from django.utils import timezone

from accounts.models.user.manager import UserManager
from core.fields import CuidField, PGEnumField, TimestampField
from core.ids import create_id


class UserRole(models.TextChoices):
    """Platform-wide role. ADMIN sees every home, job and contractor."""

    ADMIN = "ADMIN", "Admin"
    USER = "USER", "User"


class User(AbstractBaseUser):
    """A person with access to the platform."""

    id = CuidField(default=create_id)
    email = models.TextField(unique=True)
    password = models.TextField(db_column="passwordHash")
    first_name = models.TextField(db_column="firstName")
    last_name = models.TextField(db_column="lastName")
    role = PGEnumField(enum_type="UserRole", choices=UserRole.choices, default=UserRole.USER)
    refresh_token_hash = models.TextField(db_column="refreshTokenHash", null=True, blank=True)
    created_at = TimestampField(db_column="createdAt", default=timezone.now)
    updated_at = TimestampField(db_column="updatedAt", auto_now=True)

    # The table has no last_login column and nothing writes one.
    last_login = None

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        db_table = "User"

    def __str__(self) -> str:
        return self.email

    @property
    def is_admin(self) -> bool:
        """Returns True when the user holds the ADMIN role."""
        return self.role == UserRole.ADMIN
