"""The accounts app's models. Each lives in models/<name>/ with its queryset and manager."""

from accounts.models.user.model import User, UserRole

__all__ = [
    "UserRole",
    "User",
]
