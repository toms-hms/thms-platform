"""The contractor zip code table."""

from django.db import models

from contractors.models.contractor_zip_code.manager import ContractorZipCodeManager
from core.fields import CuidField
from core.ids import create_id


class ContractorZipCode(models.Model):
    """One ZIP code in a contractor's service area."""

    id = CuidField(default=create_id)
    contractor = models.ForeignKey(
        "contractors.Contractor",
        on_delete=models.CASCADE,
        db_column="contractorId",
        related_name="zip_code_rows",
    )
    zip_code = models.TextField(db_column="zipCode")

    objects = ContractorZipCodeManager()

    class Meta:
        db_table = "ContractorZipCode"

    def __str__(self) -> str:
        return self.zip_code
