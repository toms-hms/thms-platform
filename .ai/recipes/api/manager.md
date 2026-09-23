---
name: api-manager
description: Guide for writing model managers — the query layer. Use when adding filters, permission predicates, or write helpers.
---

# API Manager

Managers own every query their app makes. Resolvers call managers directly for reads; services call managers for writes.

Each model declares its manager as `objects`:

```python
class Contractor(models.Model):
    objects = ContractorManager()
```

## Base classes

- `BaseManager` — adds `get_or_404(**filters)`, which raises `NotFoundError` instead of `DoesNotExist`.
- `PermissionedManager` — `BaseManager` plus the two methods the permission layer calls: `has_permission` and `list_for_user`. Every manager guarding user-visible rows extends it. See `.ai/recipes/api/permissioning.md`.

Use `get_or_404` only where the row is expected to exist — after a permission check, typically. For an existence question use `.filter(...).exists()`.

## Filter methods

A multi-field filter is one method that narrows a queryset, one clause at a time:

```python
def filter_contractors(
    self,
    *,
    ids: list[str] | None = None,
    zip_codes: list[str] | None = None,
    trade_categories: list[str] | None = None,
    is_global: bool | None = None,
    search: str | None = None,
) -> models.QuerySet:
    """Returns contractors matching every supplied filter. An empty list matches nothing."""
    queryset = self.all()
    if ids is not None:
        queryset = queryset.filter(pk__in=ids)
    if zip_codes is not None:
        queryset = queryset.filter(zip_code_rows__zip_code__in=zip_codes).distinct()
    if trade_categories is not None:
        queryset = queryset.filter(categories__overlap=trade_categories)
    if is_global is not None:
        queryset = queryset.filter(is_global=is_global)
    if search:
        queryset = queryset.filter(
            Q(name__icontains=search) | Q(company_name__icontains=search) | Q(email__icontains=search)
        )
    return queryset
```

### Naming and semantics

- **Keyword-only arguments.** Callers name every filter.
- **Plural, list-valued** for anything that can hold several values: `trade_categories`, `zip_codes`, `ids`. A caller with one value passes `[value]`. Do not add singular aliases.
- **Domain-explicit names**: `trade_categories`, not `categories`.
- **Boolean filters** (`is_global`) and **`search`** are exempt from the plural rule. `search` is a fuzzy OR across columns; it is not a `filter_*`.
- **`None` means the filter is absent. `[]` means match nothing** — `pk__in=[]` already does exactly that, so no special case is needed.

## Rules

- **Filter in the database, never in Python.** No list comprehension that drops rows a query could have excluded.
- **No N+1.** Reach for `select_related` on forward FKs and `prefetch_related` on reverse ones. `list_for_job` returning assignments preloads `contractor`.
- **Read methods return bare rows.** A resolver asks for what else it needs; a read method does not eagerly attach relations that most callers will not use.
- **Multi-table writes are atomic.** Decorate with `@transaction.atomic` when a write touches more than one table — see `ContractorManager.create_with_zip_codes`.

## Every public method gets a one-line docstring

It says what the method returns and any assumption a caller must hold:

```python
def find_source_image(self, job_id: str):
    """Returns the first user-uploaded source image for the job, or None."""
```
