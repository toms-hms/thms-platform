---
name: api-queryset
description: Guide for <app>/models/<model_name>/queryset.py — chainable filter methods (filter_*, search), the base querysets (BaseQuerySet, HomeScopedQuerySet, UserOwnedQuerySet) and visibility (visible_to, owned_by).
---

# API QuerySet

A queryset holds the app's **chainable filters**. Each method narrows rows by one
clause and returns the queryset, so filters compose:

```python
Contractor.objects.filter_zip_codes(zip_codes).filter_trade_categories(trade_categories)
```

It lives in `models/<model_name>/queryset.py`, next to the model and its manager.
The manager is built from the queryset (`BaseManager.from_queryset(...)`, see
`manager.md`), so every method here is also callable on `Model.objects`. Import
other models **inside the method** (`from contractors.models import ContractorZipCode`).

## Pick the base class

| Base | Use when | Gives you |
| --- | --- | --- |
| `HomeScopedQuerySet` | Access comes from membership of a home (homes, jobs, quotes, …) | `filter_home_ids`, `home_id_for`, `visible_to(user, permission)` |
| `UserOwnedQuerySet` | Each row belongs to one user (rolodex, integrations) | `owner_id_for`, `owned_by(user)` |
| `BaseQuerySet` | Readable by every authenticated user (the contractor directory) | `filter_ids`, `get_or_404` |

All three include `filter_ids` and `get_or_404`.

A `HomeScopedQuerySet` subclass **must** set `home_id_path`, the lookup from the
row to its home's id: `"id"` for Home, `"home_id"` for a direct FK, and
`"job__home_id"` for a row that hangs off a job. `@authorize` and `visible_to` both use it.

## Filter methods

```python
class JobQuerySet(HomeScopedQuerySet):
    """Jobs, scoped by the home they sit under."""

    home_id_path = "home_id"

    def filter_statuses(self, statuses: list[str] | None) -> Self:
        """Returns jobs in any of the statuses."""
        if statuses is None:
            return self
        return self.filter(status__in=statuses)
```

- **Name:** `filter_<plural field>`, e.g. `filter_job_ids` or `filter_trade_categories`. Booleans
  are `filter_is_global` and `filter_needs_review`. A fuzzy multi-column match is `search(text)`.
- **One parameter, list-valued**, typed `list[str] | None`. Callers with one value pass `[value]`.
- **Guard with `if x is None: return self`. Never `if not x`.** `None` means the filter
  is absent. `[]` means match nothing, which `__in=[]` already does. `if not x` would
  turn `[]` into "no filter" and return every row.
  - `search` is the exception: empty text is no search, so it uses `if not text`.
  - A filter built by OR-ing `Q` objects in a loop must return `self.none()` for `[]`.
    An empty `Q()` matches everything.
- **Across a multi-valued relation**, filter with `Exists(...)` on a subquery, not a join
  plus `.distinct()`. `.distinct()` breaks once someone adds `order_by` or annotations.
- Return `Self`. Docstring says which rows come back.

## What does not belong here

- **Role or policy logic.** `visible_to` asks `core.permissions` which homes grant
  the permission. A queryset never checks `user.role` or `HomeRole` itself.
- **Compositions of several filters, writes, and methods returning values**
  (dicts, single rows). Those go on the manager.
- **`select_related` / `prefetch_related`** for a particular caller. The manager
  method or resolver that needs them adds them.
