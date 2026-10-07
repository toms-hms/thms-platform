"""Chainable filters for connected third-party accounts."""

from typing import Self

from core.querysets import UserOwnedQuerySet


class IntegrationQuerySet(UserOwnedQuerySet):
    """Connected accounts. Each connection belongs to one user."""

    def filter_providers(self, providers: list[str] | None) -> Self:
        """Returns connections to any of the providers."""
        if providers is None:
            return self
        return self.filter(provider__in=providers)
