"""Filter compositions and writes for the user contractor table."""

from core.managers import BaseManager
from user_contractors.models.user_contractor.queryset import UserContractorQuerySet


class UserContractorManager(BaseManager.from_queryset(UserContractorQuerySet)):
    """Lookups for rolodex entries."""

    def list_owned_by(self, user) -> UserContractorQuerySet:
        """Returns the user's rolodex entries with contractors preloaded."""
        return self.owned_by(user).select_related("contractor")

    def filter_existing(self, user_id: str, contractor_id: str):
        """Returns the user's existing entry for this contractor, or None."""
        return self.filter(user_id=user_id).filter_contractor_ids([contractor_id]).first()
