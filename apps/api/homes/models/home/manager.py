"""Filter compositions and writes for the home table."""

from core.managers import BaseManager
from homes.models.home.queryset import HomeQuerySet


class HomeManager(BaseManager.from_queryset(HomeQuerySet)):
    """Lookups for homes."""

    def find_by_id(self, home_id: str):
        """Returns the home with this id, or None."""
        return self.filter_ids([home_id]).first()
