---
name: api-file-structure
description: Where each kind of backend file lives, what belongs in it, and which layer may call which. Read before adding a new module or a new file to an existing one.
---

# API File Structure

One Django app per domain. One concern per file, and **the role is always in the
file name**: `model.py`, `queryset.py`, `manager.py`, `*_service.py`, `*_client.py`,
`*_utils.py`, `*_factory.py`.

```
apps/api/<app>/
  models/
    __init__.py               re-exports every model and enum: `from jobs.models import Job`
    <model_name>/             one folder per model, snake_case (job/, job_contractor/)
      __init__.py
      model.py                the table and the TextChoices it owns
      queryset.py             chainable filters and visibility
      manager.py              filter compositions, generic writes, value lookups
  services/
    __init__.py
    <domain>_service.py       class <Domain>Service — business logic and writes
  clients/                    only when the app talks to a vendor
    __init__.py
    <vendor>_client.py        class <Vendor>Client — the only importer of that SDK
  utils/                      only when the app has pure helpers
    __init__.py
    <topic>_utils.py          plain functions: no DB, no network
  factories/
    __init__.py               re-exports every factory: `from jobs.factories import JobFactory`
    <model_name>_factory.py   one factory module per model
  types.py                    GraphQL object types
  schema.py                   GraphQL queries and mutations, each with an access decorator
  apps.py                     AppConfig, including audit-log registration
  migrations/
  tests/
    test_querysets.py · test_managers.py · test_services.py · test_schema.py
```

`core/` follows the same shape for cross-app pieces: `core/services/`
(`permission_service.py`, `storage_service.py`), `core/clients/` (`s3_client.py`),
`core/utils/` (`crypto_utils.py`, `hashing_utils.py`, `jwt_utils.py`,
`unset_utils.py`), plus framework plumbing (`querysets.py`, `managers.py`,
`graphql.py`, `converters.py`, `middleware.py`, `errors.py`, `enums.py`, `testing.py`).

## Who may call what

| Layer | May call | Must not |
| --- | --- | --- |
| `schema.py` queries, `types.py` fields | managers and querysets (reads), `current_user`, access decorators | clients |
| `schema.py` mutations, `views.py` | services, `current_user`, access decorators | managers for writes, clients |
| services | other services and clients (via `__init__`), managers and querysets of any app, utils | vendor SDKs directly, access checks |
| clients | their vendor's SDK / HTTP API | the database, services, business rules |
| managers / querysets | their own queryset; other models inside methods | business rules, state transitions, orchestration across models |
| utils | other utils, `settings` | the database, network, vendor SDKs |

**Reads go through managers and querysets; writes go through services.** A query
resolver chains `visible_to(...).filter_*()` itself. A mutation always calls a service.

## What goes where

| File | Contains | Never contains |
| --- | --- | --- |
| `models/<name>/model.py` | Fields, `Meta`, the model's `TextChoices`, cheap derived properties | Queries, business rules |
| `models/<name>/queryset.py` | One-clause filters returning the queryset; `home_id_path` | Role or policy logic, writes |
| `models/<name>/manager.py` | Chains of filters, generic writes (`upsert`, `apply_updates`), value lookups | Business rules, access decisions |
| `services/<domain>_service.py` | Business rules, multi-step writes, cross-app coordination, cache invalidation | Vendor SDK imports, access checks, GraphQL shaping |
| `clients/<vendor>_client.py` | Calls to one vendor, returning plain data | Database access, business rules |
| `utils/<topic>_utils.py` | Pure functions and constants | I/O of any kind |
| `factories/<model>_factory.py` | One `DjangoModelFactory` (plus its variants, e.g. `AdminFactory`) | Anything used outside tests |
| `types.py` | `DjangoObjectType`s and payload `ObjectType`s | Access checks, writes |
| `schema.py` | Arguments, access decorators, reads via managers, writes via services | Types, business logic |

See `queryset.md`, `manager.md`, `service.md`, `client.md`, `utils.md`, `factory.md`,
`types.md` and `schema.md` for each file type.

## Adding a new app

1. `apps/api/<app>/` with the folders above, and an `__init__.py` in the app, `tests/`, `models/`, each model folder, `services/` and `factories/` (and `clients/` / `utils/` when present).
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
4. Add `factories/<model_name>_factory.py` and re-export it from `factories/__init__.py`.
5. Elsewhere, import models and factories from the package (`from jobs.models import Job`,
   `from jobs.factories import JobFactory`), never from the module inside it. A model folder's
   own files and a factory module's same-app imports are the only exceptions.
6. Import services, clients and utils from their module: `from quotes.services.quote_service import QuoteService`.

A resolver that needs several related collections lets GraphQL do the work: expose
them as fields on the type (see `types.md`) rather than assembling a composite payload by hand.
