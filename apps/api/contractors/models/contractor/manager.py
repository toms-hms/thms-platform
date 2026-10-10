"""Filter compositions and value lookups for the contractor table."""

from contractors.models.contractor.queryset import ContractorQuerySet
from core.managers import BaseManager


class ContractorManager(BaseManager.from_queryset(ContractorQuerySet)):
    """Filter compositions and value lookups for the contractor directory."""

    def filter_contractors(
        self,
        *,
        ids: list[str] | None = None,
        zip_codes: list[str] | None = None,
        trade_categories: list[str] | None = None,
        emails: list[str] | None = None,
        is_global: bool | None = None,
        search: str | None = None,
    ) -> ContractorQuerySet:
        """Returns contractors matching every supplied filter. An empty list matches nothing."""
        return (
            self.filter_ids(ids)
            .filter_zip_codes(zip_codes)
            .filter_trade_categories(trade_categories)
            .filter_emails(emails)
            .filter_is_global(is_global)
            .search(search)
        )

    def list_job_history(self, *, contractor_id: str) -> list[dict]:
        """Returns the contractor's job assignments, most recent first."""
        from jobs.models import JobContractor

        rows = (
            JobContractor.objects.filter(contractor_id=contractor_id)
            .select_related("job", "job__home")
            .order_by("-created_at")
        )
        return [
            {
                "job_id": row.job_id,
                "job_title": row.job.title,
                "job_status": row.job.status,
                "home_id": row.job.home_id,
                "home_name": row.job.home.name,
                "contractor_status": row.status,
            }
            for row in rows
        ]
