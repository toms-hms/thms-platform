---
name: api-file-structure
description: Where each kind of backend file lives, and what belongs in it. Read before adding a new module or a new file to an existing one.
---

# API File Structure

One Django app per domain. One concern per file.

```
apps/api/<app>/
  models.py       Table definitions and TextChoices enums
  querysets.py    Chainable filters and visibility (filter_*, visible_to, owned_by)
  managers.py     Filter compositions, writes, value-returning lookups
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
| `models.py` | Fields, `Meta`, `TextChoices`, cheap derived properties | Queries, business rules |
| `querysets.py` | One-clause filters that return the queryset; `home_id_path` | Role or policy logic, writes |
| `managers.py` | Chains of queryset filters, writes, methods returning values | Access decisions, orchestration across apps |
| `services.py` | Multi-step writes, cross-app coordination, cache invalidation | Raw ORM filtering, access checks |
| `types.py` | `DjangoObjectType`s and payload `ObjectType`s | Access checks, queries beyond relation resolvers |
| `schema.py` | Arguments, access decorators, calls into services and managers | Types, business logic |

## Adding a new app

1. `apps/api/<app>/` with the files above, and `__init__.py` in the app and its `tests/`.
2. An `AppConfig` in `apps.py` whose `ready()` registers the models with the audit log.
3. Add the app to `INSTALLED_APPS` in `config/settings.py`.
4. Add its `Query` and `Mutation` mixins to `config/schema.py`.
5. If the models need a new Postgres enum type, add it to `core/migrations/0001_enum_types.py` and depend on that migration.

## Reads and writes take different paths

- **Reads** — a resolver calls a manager or queryset chain directly. No service in between.
- **Writes** — a mutation calls a service, which calls managers.

A resolver that needs several related collections lets GraphQL do the work: expose them as fields on the type (see `JobType`) rather than assembling a composite payload by hand.
