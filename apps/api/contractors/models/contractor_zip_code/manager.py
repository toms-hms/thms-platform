"""Filter compositions and writes for the contractor zip code table."""

from contractors.models.contractor_zip_code.queryset import ContractorZipCodeQuerySet
from core.managers import BaseManager


class ContractorZipCodeManager(BaseManager.from_queryset(ContractorZipCodeQuerySet)):
    """Lookups and writes over contractor service areas."""

    def zip_codes_for(self, *, contractor_id: str) -> list[str]:
        """Returns the ZIP codes the contractor serves."""
        return list(self.filter_contractor_ids([contractor_id]).values_list("zip_code", flat=True))

    def replace_for_contractor(self, *, contractor, zip_codes: list[str]) -> None:
        """Replaces the contractor's service area with exactly these ZIP codes."""
        self.filter_contractor_ids([contractor.pk]).delete()
        self.bulk_create([self.model(contractor=contractor, zip_code=zip_code) for zip_code in zip_codes])
