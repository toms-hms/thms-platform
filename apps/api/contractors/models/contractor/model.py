"""The contractor table."""

from django.contrib.postgres.fields import ArrayField
from django.db import models

from contractors.models.contractor.manager import ContractorManager
from core.models import BaseModel


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


class Contractor(BaseModel):
    """A tradesperson or company that can be assigned to a job."""

    name = models.TextField()
    company_name = models.TextField(null=True, blank=True)
    email = models.TextField(null=True, blank=True)
    phone = models.TextField(null=True, blank=True)
    categories = ArrayField(models.CharField(max_length=32, choices=TradeCategory.choices))
    notes = models.TextField(null=True, blank=True)
    is_global = models.BooleanField(default=False)

    objects = ContractorManager()
