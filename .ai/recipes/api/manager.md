---
name: api-manager
description: Guide for <app>/models/<model_name>/manager.py — composing several queryset filters into one named lookup (filter_contractors, filter_communications), writes, and methods that return values. Managers make no access decisions.
---

# API Manager

A manager sits on top of the app's queryset. It owns:

- **Compositions:** named lookups that chain several queryset filters.
- **Generic writes** on its own table that need more than `create()`, e.g. `upsert`. Every manager also inherits `apply_updates(instance, **fields)` from `BaseManager`, the partial-update write services use (see `service.md`).
- **Methods that return values** rather than a queryset: a single row, a dict, a list of dicts.

It lives in `models/<model_name>/manager.py`. The chainable filters live next to
it in `queryset.py` (see `queryset.md`). Access control does not live here at all
(see `permissioning.md`), and neither do business rules. Status transitions,
stamping timestamps, writes across several tables and anything a product
decision could change belong in a service (see `service.md`).

## Declaring a manager

Build it from the app's queryset so every filter is reachable on `Model.objects`:

```python
from core.managers import BaseManager
from jobs.models.job_contractor.queryset import JobContractorQuerySet


class JobContractorManager(BaseManager.from_queryset(JobContractorQuerySet)):
    """Lookups and status transitions for contractor assignments."""
```

The model declares it as `objects = JobContractorManager()`. A manager only ever
imports its own folder's queryset. Other models are imported inside methods, from the
app package (`from jobs.models import Job`).

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
```

- **A composition combines several filters.** One filter, with or without a preload, is
  not a manager method. Call it at the call site:
  `Quote.objects.filter_job_ids(job_ids).select_related("contractor")`.
- **Name it `filter_<plural model>`** (`filter_contractors`, `filter_communications`), with
  every argument optional and defaulting to `None`.
- **Preloads belong to the caller.** Only the resolver knows which relations the response
  reads, so `select_related` / `prefetch_related` go there, not in the composition.

- **Keyword-only arguments** for every filter and for any method with more than one parameter of the same type (`upsert(*, user_id, home_id, role)`). Names are plural and domain-explicit,
  matching the queryset method they feed (`trade_categories`, not `categories`).
- A composition returns the queryset, so the caller can keep chaining, e.g. `visible_to` or `.prefetch_related`.
- If a filter is missing, add it to the queryset first, then chain it here.

## Writes

- A write touching more than one table is orchestration. It belongs in a service, under `@transaction.atomic` there.
- A write on one table that takes more than one queryset call is a manager method, e.g. `ContractorZipCode.objects.replace_for_contractor(...)`, `UserHome.objects.remove(...)`.

## Single-row lookups

Don't wrap a single lookup in a per-model method (`find_by_id`, `find_by_email`). Use the
generic `Model.objects.find(**filters)`, which returns the row or `None`. It wraps `.get()`,
so a lookup that matches several rows still raises, and a malformed id returns `None`.

The repo layer never decides that a missing row is an error. The caller does:

```python
quote = Quote.objects.find(pk=quote_id)
if quote is None:
    raise NotFoundError("Quote")
```

`NotFoundError` is a domain error; `core.graphql.to_graphql_error` turns it into
`NOT_FOUND` on the wire, so no resolver catches it.

`find` is for lookups where **at most one row can match** (a primary key, a unique
column, a unique pair). Never loosen it to `.filter(...).first()`: a second match is a data
bug, and `find` surfaces it instead of quietly returning one of the rows.

When several rows may legitimately match and any one (or the earliest) will do, use a
name that says so: `find_first(**filters)`, returning the first row by the model's
`Meta.ordering`, or `None`. Don't call it `first` (that shadows Django's
`QuerySet.first()`), and don't add a per-model `find_<thing>` wrapper for it.

## Rules

- **No access decisions.** No `user.role`, `is_admin` or membership checks, and no
  `user_id` parameter used to decide visibility. Resolvers declare access with
  `@authorize` / `@owner_required` and scope collections with `visible_to` / `owned_by`.
- **Filter in the database**, never in Python.
- **No N+1.** The caller adds `select_related` / `prefetch_related` for the relations it reads.
- One-line docstring on every public method: what it returns and any assumption.
