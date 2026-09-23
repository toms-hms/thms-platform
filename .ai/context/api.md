# API

Django 5.2 + Graphene (GraphQL) + PostgreSQL. Python 3.12, dependencies managed with `uv`.

## The API is GraphQL

One endpoint, `POST /graphql`. GraphiQL is served at the same path when `GRAPHIQL_ENABLED` is set.
The only other routes are `GET /health` and the two OAuth callbacks the providers redirect a browser to.

## Module structure (enforced)

```
apps/api/
  config/
    settings.py     environment-driven configuration
    urls.py         /graphql, /health, OAuth callbacks
    views.py        the GraphQL view: rate limiting and error codes
    schema.py       the schema root — combines every app's Query and Mutation
  core/
    fields.py       PGEnumField, CuidField, TimestampField, JsonField
    ids.py          CUID2 generation — the app supplies every primary key
    errors.py       domain errors and their GraphQL error codes
    hashing.py      raw-bcrypt password hashing
    jwt_utils.py    access/refresh token signing
    crypto.py       AES-256-GCM for OAuth tokens at rest
    managers.py     BaseManager, PermissionedManager
    permissions.py  the permission cache
    middleware.py   JWT → request.user
    audit.py        the audit log query
    testing.py      GraphQLTestCase
  <app>/
    models.py       tables, mapped onto the pre-existing schema
    managers.py     query methods + the permission predicates
    services.py     orchestration for writes
    schema.py       GraphQL types, queries, mutations
    factories.py    test factories
    tests/          test_managers.py, test_services.py, test_schema.py
```

Apps: `accounts`, `homes`, `contractors`, `user_contractors`, `jobs`, `quotes`, `communications`, `ai`, `integrations`, plus `uploads` (services only, no models).

## The schema predates Django

The database was built by drizzle-kit and is mapped, not regenerated:

- Tables are PascalCase (`"Job"`, `"User"`); `user_contractors` is the one snake_case table.
- Columns are camelCase (`homeId`, `createdAt`), except on `user_contractors` and `Job.ai_session` / `Contractor.is_global`.
- Primary keys are CUID2 **strings the application generates** — `core.ids.create_id`, wired as the field default.
- Enums are native Postgres types (`"TradeCategory"`, `"JobStatus"`, …), declared with `PGEnumField`.
- Timestamps are naive `timestamp(3)`. `USE_TZ` is off so the ORM round-trips them unchanged.
- `UserHome` has a composite primary key `(userId, homeId)` — `models.CompositePrimaryKey`.

Python attribute names are snake_case; `db_column` carries the real column name. Never rename a column to suit Django.

## Non-obvious patterns

- Passwords are **raw bcrypt** (`$2a$…`), not Django's `algorithm$…` format, so hashes written by the previous API still verify. bcrypt reads only the first 72 bytes — `core.hashing` truncates explicitly because refresh tokens are longer than that.
- Auth is stateless JWT, not Django sessions. `core.middleware.JWTAuthenticationMiddleware` sets `request.user`, and it runs **before** `AuditlogMiddleware` so audit entries have an actor.
- `convert_choices_to_enum = False` on every `DjangoObjectType`: outputs stay plain strings. Inputs use the explicit enums in `core/enums.py`.
- Types expose flat FK ids (`jobId`, `contractorId`) alongside nested objects, so a client can get an id without a nested selection.
- The permission cache is an optimisation, never the authority — if the cache backend is down, checks fall through to the database and the rate limiter fails open.
- `django.contrib.auth` is deliberately **not** installed: nothing uses Django's permissions, groups or admin, and leaving it out keeps those tables out of the database. `AUTH_USER_MODEL` still points at `accounts.User`.

## Commands

```bash
make migrate         # makemigrations + migrate, inside the container
make migrate-adopt   # first run against a database the old API created (--fake-initial)
make seed            # demo data
make test-api        # the full test suite
make graphql-schema  # write schema.graphql
```
