"""Chainable filters for the contractor table."""

from typing import Self

from django.db.models import Exists, OuterRef, Q

from core.querysets import BaseQuerySet


class ContractorQuerySet(BaseQuerySet):
    """Contractors. The directory is readable by every authenticated user, so it is not scoped."""

    def filter_zip_codes(self, zip_codes: list[str] | None) -> Self:
        """Returns contractors serving any of the ZIP codes."""
        if zip_codes is None:
            return self
        from contractors.models import ContractorZipCode

        serves = ContractorZipCode.objects.filter(contractor=OuterRef("pk"), zip_code__in=zip_codes)
        return self.filter(Exists(serves))

    def filter_trade_categories(self, trade_categories: list[str] | None) -> Self:
        """Returns contractors working in any of the trade categories."""
        if trade_categories is None:
            return self
        return self.filter(categories__overlap=trade_categories)

    def filter_emails(self, emails: list[str] | None) -> Self:
        """Returns contractors whose email matches any of the given addresses, case-insensitively."""
        if emails is None:
            return self
        if not emails:
            return self.none()
        match = Q()
        for email in emails:
            match |= Q(email__iexact=email)
        return self.filter(match)

    def filter_is_global(self, is_global: bool | None) -> Self:
        """Returns contractors in (True) or out of (False) the shared directory."""
        if is_global is None:
            return self
        return self.filter(is_global=is_global)

    def search(self, text: str | None) -> Self:
        """Returns contractors whose name, company name or email contains the text."""
        if not text:
            return self
        return self.filter(
            Q(name__icontains=text) | Q(company_name__icontains=text) | Q(email__icontains=text)
        )
