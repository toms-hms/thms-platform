"""Chainable filters for the job table."""

from typing import Self

from core.querysets import HomeScopedQuerySet


class JobQuerySet(HomeScopedQuerySet):
    """Jobs, scoped by the home they sit under."""

    home_id_path = "home_id"

    def filter_statuses(self, statuses: list[str] | None) -> Self:
        """Returns jobs in any of the statuses."""
        if statuses is None:
            return self
        return self.filter(status__in=statuses)

    def filter_trade_categories(self, trade_categories: list[str] | None) -> Self:
        """Returns jobs whose primary trade category is any of the given ones."""
        if trade_categories is None:
            return self
        return self.filter(category__in=trade_categories)
