# THMS Rules

The backend is Python (Django + Graphene); the frontend is TypeScript (Next.js). Where a rule is language-specific it says so.

## Function signatures

**Python.** Keyword-only arguments for anything with more than one parameter of the same type, for every filter, and for **every** service and client method (`def update(self, *, quote_id, ...)`). Callers name what they pass.

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

Django owns the schema. No `db_table` / `db_column` overrides. Primary keys are `UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`. Choices are `CharField(choices=...)`. Timestamps are timezone-aware `DateTimeField`s. Every foreign key names its `on_delete` deliberately, never `DO_NOTHING`. See `.ai/recipes/api/model.md`.

## QuerySets and managers

- Each model lives in `<app>/models/<model_name>/` with `model.py`, `queryset.py` and `manager.py`. The package `models/__init__.py` re-exports it. Import models as `from <app>.models import X`.
- **`queryset.py`** holds chainable one-clause filters. A filter takes `list[...] | None` and starts with `if x is None: return self`, never `if not x`. `[]` must match nothing.
- **`manager.py`** is built with `BaseManager.from_queryset(...)`. It holds compositions of those filters, generic writes (`upsert`, `apply_updates`), and methods that return values.
- Neither holds business rules nor makes access decisions.

See `.ai/recipes/api/queryset.md` and `.ai/recipes/api/manager.md`.

## Services, clients and utils

- **Business logic lives in services:** classes in `<app>/services/<domain>_service.py`. Every mutation calls one; queries read through managers and querysets directly.
- **Every vendor SDK is wrapped in a client:** a class in `<app>/clients/<vendor>_client.py`. Only that file imports the SDK, and only services use clients.
- Services take their clients and other services as keyword-only `__init__` arguments that default to the real ones. Tests pass fakes there instead of patching module paths.
- **Updates use `UNSET`:** optional fields default to `UNSET`, the method ends with `Model.objects.apply_updates(...)`, and `None` means "clear". Never use a `setattr` loop over a dict.
- **Pure helpers are functions** in `<app>/utils/<topic>_utils.py`: no database, no network.
- The role is in every file name: `model.py`, `queryset.py`, `manager.py`, `*_service.py`, `*_client.py`, `*_utils.py`, `*_factory.py`.

See `.ai/recipes/api/file-structure.md` for who may call what, plus `service.md`, `client.md` and `utils.md`.

## Access control

Declared on the resolver, decided in one place (`PermissionService.can` in `core/services/permission_service.py`):

- `@authorize(Permission.X, resource=Model, arg="model_id")` for home-scoped rows
- `@owner_required(resource=Model, arg="model_id")` for user-owned rows
- `@login_required` / `@admin_required` for everything else
- Collections start from `Model.objects.visible_to(user, Permission.X)` or `owned_by(user)`, never from `.all()`

No role or membership checks in managers, querysets or services. See `.ai/recipes/api/permissioning.md`.

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

Never hand-write a migration for a schema change — edit the model and run `make migrate`. Hand-written migrations are for data only (`RunPython`). See `.ai/recipes/api/migrations.md`.

## Tests

Django's built-in test runner and `TestCase`; factories are `factory_boy` `DjangoModelFactory`, one module per model in the app's `factories/` package. Each app has `tests/test_querysets.py`, `tests/test_managers.py`, `tests/test_services.py` and `tests/test_schema.py` as it needs them. Third parties are always mocked. See `.ai/recipes/api/testing.md`.

## Branching

Never push directly to `main` or any default branch. Always create a feature branch and push there. Direct pushes to `main` are only permitted when the user explicitly instructs it.

## App boundaries

Code inside `apps/web` may only import from `apps/web` (via `@/`) and node_modules. Code inside `apps/api` may only import from `apps/api`.

The web and api deploy to separate servers — they cannot share runtime code. Types that cross the boundary are declared in `apps/web/src/types/api.ts`, which mirrors the GraphQL schema and is updated in the same change as the schema.

This is a hard rule. Cross-app imports break independent deployment.
