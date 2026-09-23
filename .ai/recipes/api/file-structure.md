---
name: api-file-structure
description: Where each kind of backend file lives, and what belongs in it. Read before adding a new module or a new file to an existing one.
---

# API File Structure

One Django app per domain. One concern per file.

```
apps/api/<app>/
  models.py       Table definitions and TextChoices enums
  managers.py     Query methods and permission predicates
  services.py     Write orchestration
  schema.py       GraphQL types, queries and mutations
  factories.py    Test factories, one per model
  apps.py         AppConfig, including audit-log registration
  migrations/
  tests/
    test_managers.py
    test_services.py
    test_schema.py
```

## What goes where

| File | Contains | Never contains |
| --- | --- | --- |
| `models.py` | Fields, `Meta`, `TextChoices`, cheap derived properties | Queries, business rules |
| `managers.py` | Every query the app makes; `has_permission`; `list_for_user` | Orchestration across apps |
| `services.py` | Multi-step writes, cross-app coordination, cache invalidation | Raw ORM filtering that belongs in a manager |
| `schema.py` | Types, arguments, auth gates, calls into services and managers | Business logic |

## Adding a new app

1. `apps/api/<app>/` with the files above, and `__init__.py` in the app and its `tests/`.
2. An `AppConfig` in `apps.py` whose `ready()` registers the models with the audit log.
3. Add the app to `INSTALLED_APPS` in `config/settings.py`.
4. Add its `Query` and `Mutation` mixins to `config/schema.py`.
5. If the models need a new Postgres enum type, add it to `core/migrations/0001_enum_types.py` and depend on that migration.

## Reads and writes take different paths

- **Reads** — a resolver calls a manager directly. No service in between.
- **Writes** — a mutation calls a service, which calls managers.

A resolver that needs several related collections lets GraphQL do the work: expose them as fields on the type (see `JobType`) rather than assembling a composite payload by hand.
