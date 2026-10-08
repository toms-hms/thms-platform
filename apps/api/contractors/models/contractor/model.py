"""The contractor table."""

from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.utils import timezone

from contractors.models.contractor.manager import ContractorManager
from core.fields import CuidField, PGEnumField, TimestampField
from core.ids import create_id


class TradeCategory(models.TextChoices):
    """The trade a contractor works in, and the category a job falls under."""

    PLUMBING = "PLUMBING", "Plumbing"
    ELECTRICAL = "ELECTRICAL", "Electrical"
    HVAC = "HVAC", "HVAC"
    ROOFING = "ROOFING", "Roofing"
    PAINTING = "PAINTING", "Painting"
    LANDSCAPING = "LANDSCAPING", "Landscaping"
    GENERAL_CONTRACTING = "GENERAL_CONTRACTING", "General contracting"
    CARPENTRY = "CARPENTRY", "Carpentry"
    FLOORING = "FLOORING", "Flooring"
    PEST_CONTROL = "PEST_CONTROL", "Pest control"
    DOORS_AND_WINDOWS = "DOORS_AND_WINDOWS", "Doors and windows"
    POOL_AND_SPA = "POOL_AND_SPA", "Pool and spa"


class Contractor(models.Model):
    """A tradesperson or company that can be assigned to a job."""

    id = CuidField(default=create_id)
    name = models.TextField()
    company_name = models.TextField(db_column="companyName", null=True, blank=True)
    email = models.TextField(null=True, blank=True)
    phone = models.TextField(null=True, blank=True)
    categories = ArrayField(PGEnumField(enum_type="TradeCategory", choices=TradeCategory.choices))
    notes = models.TextField(null=True, blank=True)
    is_global = models.BooleanField(db_column="is_global", default=False)
    created_at = TimestampField(db_column="createdAt", default=timezone.now)
    updated_at = TimestampField(db_column="updatedAt", auto_now=True)

    objects = ContractorManager()

    class Meta:
        db_table = "Contractor"

    def __str__(self) -> str:
        return self.company_name or self.name

    @property
    def zip_codes(self) -> list[str]:
        """Returns the ZIP codes this contractor serves."""
        return [z.zip_code for z in self.zip_code_rows.all()]
