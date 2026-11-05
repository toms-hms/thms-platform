"""The contractor zip code table."""

from django.db import models

from contractors.models.contractor_zip_code.manager import ContractorZipCodeManager
from core.models import BaseModel


class ContractorZipCode(BaseModel):
    """One ZIP code in a contractor's service area."""

    contractor = models.ForeignKey(
        "contractors.Contractor",
        on_delete=models.CASCADE,
        related_name="zip_code_rows",
    )
    zip_code = models.TextField()

    objects = ContractorZipCodeManager()
