---
name: api-manager
description: Guide for <app>/managers.py — composing queryset filters into named lookups (filter_contractors, list_for_job), writes, and methods that return values. Managers make no access decisions.
---

# API Manager

A manager sits on top of the app's queryset. It owns:

- **Compositions:** named lookups that chain several queryset filters.
- **Writes** that need more than `create()`, e.g. upserts or atomic multi-table writes.
- **Methods that return values** rather than a queryset: a single row, a dict, a list of dicts.

The chainable filters themselves live in `querysets.py` (see `queryset.md`).
Access control does not live here at all (see `permissioning.md`).

## Declaring a manager

Build it from the app's queryset so every filter is reachable on `Model.objects`:

```python
from core.managers import BaseManager
from jobs.querysets import JobContractorQuerySet


class JobContractorManager(BaseManager.from_queryset(JobContractorQuerySet)):
    """Lookups and status transitions for contractor assignments."""
```

The model declares it as `objects = JobContractorManager()`. An app with no
filters of its own still uses `BaseManager`, which carries `filter_ids` and `get_or_404`.

## Compositions

Chain the queryset filters. Do not rewrite them with raw `.filter(...)`:

```python
def filter_contractors(
    self,
    *,
    ids: list[str] | None = None,
    zip_codes: list[str] | None = None,
    trade_categories: list[str] | None = None,
    is_global: bool | None = None,
    search: str | None = None,
) -> ContractorQuerySet:
    """Returns contractors matching every supplied filter. An empty list matches nothing."""
    return (
        self.filter_ids(ids)
        .filter_zip_codes(zip_codes)
        .filter_trade_categories(trade_categories)
        .filter_is_global(is_global)
        .search(search)
    )


def list_for_job(self, job_id: str) -> QuoteQuerySet:
    """Returns the quotes on a job with contractors preloaded."""
    return self.filter_job_ids([job_id]).select_related("contractor")
```

- **Keyword-only arguments** for every filter. Names are plural and domain-explicit,
  matching the queryset method they feed (`trade_categories`, not `categories`).
- A composition returns the queryset, so the caller can keep chaining, e.g. `visible_to` or `.prefetch_related`.
- If a filter is missing, add it to the queryset first, then chain it here.

## Writes

- A write touching more than one table is `@transaction.atomic`.
- Use `get_or_404(pk=...)` where the row must exist. It raises `NotFoundError`.

## Rules

- **No access decisions.** No `user.role`, `is_admin` or membership checks, and no
  `user_id` parameter used to decide visibility. Resolvers declare access with
  `@authorize` / `@owner_required` and scope collections with `visible_to` / `owned_by`.
- **Filter in the database**, never in Python.
- **No N+1.** Add `select_related` / `prefetch_related` in the composition that needs it.
- One-line docstring on every public method: what it returns and any assumption.
