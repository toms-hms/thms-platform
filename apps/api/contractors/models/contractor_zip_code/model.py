"""The contractor zip code table."""

import uuid

from django.db import models

from contractors.models.contractor_zip_code.manager import ContractorZipCodeManager


class ContractorZipCode(models.Model):
    """One ZIP code in a contractor's service area."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contractor = models.ForeignKey(
        "contractors.Contractor",
        on_delete=models.CASCADE,
        related_name="zip_code_rows",
    )
    zip_code = models.TextField()

    objects = ContractorZipCodeManager()

    def __str__(self) -> str:
        return self.zip_code
