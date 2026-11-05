"""Filter compositions and writes for the user table."""

from accounts.models.user.queryset import UserQuerySet
from core.managers import BaseManager


class UserManager(BaseManager.from_queryset(UserQuerySet)):
    """Lookups for user accounts. Create users with `User.objects.create(password=make_password(...))`."""
