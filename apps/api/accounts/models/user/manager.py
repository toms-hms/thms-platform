"""Filter compositions and writes for the user table."""

from accounts.models.user.queryset import UserQuerySet
from core.managers import BaseManager


class UserManager(BaseManager.from_queryset(UserQuerySet)):
    """Lookups and password checks for user accounts.

    Create users with `User.objects.create(password=make_password(...))`.
    """

    def check_password(self, user, password: str) -> bool:
        """Returns True when the password matches the user's stored hash.

        Wraps Django's `AbstractBaseUser.check_password`, which also re-saves the hash
        when the configured hasher has changed, so services never call it on the instance.
        """
        return user.check_password(password)
