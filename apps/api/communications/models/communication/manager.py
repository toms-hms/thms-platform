"""Filter compositions and writes for the communication table."""

from communications.models.communication.queryset import CommunicationQuerySet
from core.managers import BaseManager


class CommunicationManager(BaseManager.from_queryset(CommunicationQuerySet)):
    """Lookups for messages."""

    def filter_communications(
        self,
        *,
        contractor_ids: list[str] | None = None,
        job_ids: list[str] | None = None,
        directions: list[str] | None = None,
        needs_review: bool | None = None,
    ) -> CommunicationQuerySet:
        """Returns messages matching every supplied filter. An empty list matches nothing."""
        return (
            self.filter_contractor_ids(contractor_ids)
            .filter_directions(directions)
            .filter_job_ids(job_ids)
            .filter_needs_review(needs_review)
        )
