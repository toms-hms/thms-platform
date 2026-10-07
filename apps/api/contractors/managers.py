"""Query compositions and writes for contractors and their service areas."""

from django.db import transaction

from contractors.querysets import ContractorQuerySet, ContractorZipCodeQuerySet
from core.managers import BaseManager


class ContractorManager(BaseManager.from_queryset(ContractorQuerySet)):
    """Filter compositions and writes for the contractor directory."""

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

    @transaction.atomic
    def create_with_zip_codes(self, *, zip_codes: list[str], **fields):
        """Creates a contractor and its service-area ZIP codes in one transaction."""
        from contractors.models import ContractorZipCode

        contractor = self.create(**fields)
        ContractorZipCode.objects.bulk_create(
            [ContractorZipCode(contractor=contractor, zip_code=z) for z in zip_codes]
        )
        return contractor

    @transaction.atomic
    def update_with_zip_codes(self, contractor_id: str, *, zip_codes: list[str] | None = None, **fields):
        """Updates a contractor's fields and, when zip_codes is given, replaces its service area."""
        from contractors.models import ContractorZipCode

        contractor = self.get_or_404(pk=contractor_id)
        for key, value in fields.items():
            setattr(contractor, key, value)
        contractor.save()
        if zip_codes is not None:
            ContractorZipCode.objects.filter(contractor=contractor).delete()
            ContractorZipCode.objects.bulk_create(
                [ContractorZipCode(contractor=contractor, zip_code=z) for z in zip_codes]
            )
        return contractor

    def promote(self, contractor_id: str):
        """Marks a private contractor as global so it appears in the shared directory. Admin only."""
        contractor = self.get_or_404(pk=contractor_id)
        contractor.is_global = True
        contractor.save()
        return contractor

    def list_job_history(self, contractor_id: str) -> list[dict]:
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


class ContractorZipCodeManager(BaseManager.from_queryset(ContractorZipCodeQuerySet)):
    """Lookups over contractor service areas."""
