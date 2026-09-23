"""Query methods for contractors and their service areas."""

from django.db import models, transaction
from django.db.models import Q

from core.managers import BaseManager, PermissionedManager


class ContractorManager(PermissionedManager):
    """Filtering and writes for the contractor directory."""

    def filter_contractors(
        self,
        *,
        ids: list[str] | None = None,
        zip_codes: list[str] | None = None,
        trade_categories: list[str] | None = None,
        emails: list[str] | None = None,
        is_global: bool | None = None,
        search: str | None = None,
    ) -> models.QuerySet:
        """Returns contractors matching every supplied filter. An empty list matches nothing."""
        queryset = self.all()
        if ids is not None:
            queryset = queryset.filter(pk__in=ids)
        if zip_codes is not None:
            queryset = queryset.filter(zip_code_rows__zip_code__in=zip_codes).distinct()
        if trade_categories is not None:
            queryset = queryset.filter(categories__overlap=trade_categories)
        if emails is not None:
            email_match = Q()
            for email in emails:
                email_match |= Q(email__iexact=email)
            queryset = queryset.filter(email_match) if emails else queryset.none()
        if is_global is not None:
            queryset = queryset.filter(is_global=is_global)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(company_name__icontains=search) | Q(email__icontains=search)
            )
        return queryset

    def has_permission(self, user_id: str, resource_id: str) -> bool:
        """Always True — the directory is readable by every authenticated user. Writes are admin-gated."""
        return True

    def list_for_user(self, user_id: str, role: str, **filters) -> models.QuerySet:
        """Returns the global contractor directory."""
        return self.filter_contractors(is_global=True)

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


class ContractorZipCodeManager(BaseManager):
    """Lookups over contractor service areas."""

    def list_for_contractors(self, contractor_ids: list[str]) -> models.QuerySet:
        """Returns the ZIP code rows for the given contractors in one query."""
        return self.filter(contractor_id__in=contractor_ids)
