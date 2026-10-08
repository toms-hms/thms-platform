"""Filter compositions and writes for the communication table."""

from communications.models.communication.queryset import CommunicationQuerySet
from core.managers import BaseManager


class CommunicationManager(BaseManager.from_queryset(CommunicationQuerySet)):
    """Lookups for messages."""

    def list_for_job(
        self,
        job_id: str,
        *,
        contractor_ids: list[str] | None = None,
        needs_review: bool | None = None,
        directions: list[str] | None = None,
    ) -> CommunicationQuerySet:
        """Returns the messages on a job, narrowed by any supplied filter, with contractors preloaded."""
        return (
            self.filter_job_ids([job_id])
            .filter_contractor_ids(contractor_ids)
            .filter_needs_review(needs_review)
            .filter_directions(directions)
            .select_related("contractor")
        )
