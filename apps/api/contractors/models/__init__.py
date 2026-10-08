"""The contractors app's models. Each lives in models/<name>/ with its queryset and manager."""

from contractors.models.contractor.model import Contractor, TradeCategory
from contractors.models.contractor_zip_code.model import ContractorZipCode

__all__ = [
    "TradeCategory",
    "Contractor",
    "ContractorZipCode",
]
