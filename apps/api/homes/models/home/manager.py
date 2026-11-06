"""Filter compositions and writes for the home table."""

from core.managers import BaseManager
from homes.models.home.queryset import HomeQuerySet


class HomeManager(BaseManager.from_queryset(HomeQuerySet)):
    """Lookups for homes."""
