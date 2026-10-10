"""Filter compositions and writes for the contractor zip code table."""

from contractors.models.contractor_zip_code.queryset import ContractorZipCodeQuerySet
from core.managers import BaseManager


class ContractorZipCodeManager(BaseManager.from_queryset(ContractorZipCodeQuerySet)):
    """Lookups over contractor service areas."""
