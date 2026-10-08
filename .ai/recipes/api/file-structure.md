---
name: api-file-structure
description: Where each kind of backend file lives, and what belongs in it. Read before adding a new module or a new file to an existing one.
---

# API File Structure

One Django app per domain. One concern per file.

```
apps/api/<app>/
  models/
    __init__.py   Re-exports every model and enum, so `from jobs.models import Job` works
    <model_name>/ One folder per model, snake_case (job/, job_contractor/)
      __init__.py
      model.py    The table definition and the TextChoices enums it owns
      queryset.py Chainable filters and visibility (filter_*, visible_to, owned_by)
      manager.py  Filter compositions, writes, value-returning lookups
  services.py     Write orchestration
  types.py        GraphQL object types
  schema.py       GraphQL queries and mutations, with their access decorators
  factories.py    Test factories, one per model
  apps.py         AppConfig, including audit-log registration
  migrations/
  tests/
    test_querysets.py
    test_managers.py
    test_services.py
    test_schema.py
```

## What goes where

| File | Contains | Never contains |
| --- | --- | --- |
| `models/<name>/model.py` | Fields, `Meta`, the `TextChoices` this model owns, cheap derived properties | Queries, business rules |
| `models/<name>/queryset.py` | One-clause filters that return the queryset; `home_id_path` | Role or policy logic, writes |
| `models/<name>/manager.py` | Chains of queryset filters, writes, methods returning values | Access decisions, orchestration across apps |
| `models/__init__.py` | Imports from each `model.py` and an `__all__` | Anything else |
| `services.py` | Multi-step writes, cross-app coordination, cache invalidation | Raw ORM filtering, access checks |
| `types.py` | `DjangoObjectType`s and payload `ObjectType`s | Access checks, queries beyond relation resolvers |
| `schema.py` | Arguments, access decorators, calls into services and managers | Types, business logic |

## Adding a new app

1. `apps/api/<app>/` with the files above, and `__init__.py` in the app, its `tests/`, `models/` and each model folder.
2. An `AppConfig` in `apps.py` whose `ready()` registers the models with the audit log.
3. Add the app to `INSTALLED_APPS` in `config/settings.py`.
4. Add its `Query` and `Mutation` mixins to `config/schema.py`.
5. Run `make migrate` to generate the app's initial migration.

## Adding a model to an existing app

1. Create `models/<model_name>/` with `__init__.py`, `model.py`, `queryset.py` and `manager.py`.
   - Every model gets all three files.
   - A queryset with no filters yet is a bare subclass of the right base (see `queryset.md`).
2. Add the model and its enums to `models/__init__.py`: one import line plus `__all__` entries.
3. Point a foreign key at a sibling model with a string (`"homes.Home"`), never by importing it.
   `model.py` files do not import each other.
4. Elsewhere, import models from the package (`from jobs.models import Job`), never from
   `jobs.models.job.model`. The only exception is a model folder's own files.

## Reads and writes take different paths

- **Reads** — a resolver calls a manager or queryset chain directly. No service in between.
- **Writes** — a mutation calls a service, which calls managers.

A resolver that needs several related collections lets GraphQL do the work: expose them as fields on the type (see `JobType`) rather than assembling a composite payload by hand.
