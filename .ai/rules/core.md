# THMS Rules

The backend is Python (Django + Graphene); the frontend is TypeScript (Next.js). Where a rule is language-specific it says so.

## Function signatures

**Python.** Keyword-only arguments for anything with more than one parameter of the same type, and for every filter. Callers name what they pass.

```python
# good
def filter_contractors(self, *, zip_codes=None, trade_categories=None, search=None): ...

# bad — positional soup at the call site
def filter_contractors(self, zip_codes=None, trade_categories=None, search=None): ...
```

**TypeScript.** Destructure options-bag parameters at the signature, not in the body. The exception: when a destructured name would shadow something in scope, use a namespace import to disambiguate rather than renaming the destructure.

## Imports

- **Python.** Absolute imports from the app root (`from jobs.models import Job`). Import inside a function only to break a genuine cycle — managers and services do this deliberately.
- **TypeScript.** `@/` for any import that crosses a directory boundary; `./` only for same-directory imports.

## API responses

The API is GraphQL. Errors carry a stable `extensions.code` — `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `CONFLICT`, `BAD_REQUEST`, `VALIDATION_ERROR`, `RATE_LIMITED`, `INTERNAL_ERROR`. Raise the matching error from `core.errors`; never invent a code, and never return a database message, stack trace or provider response to a client.

## API and client contracts

Use explicit domain names and plural arrays for list filters whenever a field can hold multiple values. Do not add singular aliases for convenience. A client filtering contractors by one category still sends `tradeCategories: [value]`, not `category: value`; one ZIP still uses `zipCodes: [value]`. Prefer `tradeCategories` over generic `categories` at API and client boundaries.

## Enums and model constants

Always use the defined enum member instead of a raw string.

- Python: `JobIntent.ISSUE`, `TradeCategory.HVAC`, `JobStatus.DRAFT`, `UserRole.ADMIN` — defined as `TextChoices` in the owning app's `models.py`, exposed to GraphQL through `core/enums.py`.
- TypeScript: the same names from `@/types/api`.

## State transitions

Never auto-transition job or contractor status. The user controls all state.

## Models

The database predates Django. Map it; do not regenerate it. Always set `db_table` and `db_column`, keep CUID2 string primary keys, declare Postgres enums with `PGEnumField`, and use `TimestampField` for `timestamp(3)` columns. See `.ai/recipes/api/model.md`.

## Managers

Every manager guarding user-visible rows extends `PermissionedManager` and implements:

- `has_permission(user_id, resource_id)` — a pure data check for one row, with no role logic
- `list_for_user(user_id, role, **filters)` — the collection visibility query, where ADMIN is handled explicitly

Resolvers gate single objects with `permissions.require(...)`. See `.ai/recipes/api/permissioning.md`, and `.ai/recipes/api/manager.md` before writing any manager method.

## Queries

Filter in the database, never in Python or JavaScript. No N+1: use `select_related` / `prefetch_related`, or one `__in` query for related rows. A multi-table write is wrapped in `@transaction.atomic`.

## Auth

Every query and mutation requires a bearer token except `login`, `register` and `refreshTokens`.

## Comments

Every public function, method, class and module has a docstring (Python) or one-line JSDoc (TypeScript) describing what it does, its key assumptions, and what it returns. No commenting the obvious.

```python
def filter_existing(self, user_id: str, contractor_id: str):
    """Returns the user's existing entry for this contractor, or None."""
```

## Migrations

Never hand-write a migration for a schema change — edit the model and run `make migrate`. Hand-written SQL is for data migrations and for Postgres enum changes, which Django cannot express. See `.ai/recipes/api/migrations.md`.

## Tests

Django's built-in test runner and `TestCase`; factories are `factory_boy` `DjangoModelFactory`, one per model in the app's `factories.py`. Each app has `tests/test_managers.py`, `tests/test_services.py` and `tests/test_schema.py`. Third parties are always mocked. See `.ai/recipes/api/testing.md`.

## Branching

Never push directly to `main` or any default branch. Always create a feature branch and push there. Direct pushes to `main` are only permitted when the user explicitly instructs it.

## App boundaries

Code inside `apps/web` may only import from `apps/web` (via `@/`) and node_modules. Code inside `apps/api` may only import from `apps/api`.

The web and api deploy to separate servers — they cannot share runtime code. Types that cross the boundary are declared in `apps/web/src/types/api.ts`, which mirrors the GraphQL schema and is updated in the same change as the schema.

This is a hard rule. Cross-app imports break independent deployment.
