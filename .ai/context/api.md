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
    converters.py   GraphQL field conversions (UUID → String)
    errors.py       domain errors and their GraphQL error codes
    hashing.py      refresh-token digests (passwords use Django's hashers)
    jwt_utils.py    access/refresh token signing
    crypto.py       AES-256-GCM for OAuth tokens at rest
    querysets.py    BaseQuerySet, HomeScopedQuerySet, UserOwnedQuerySet
    managers.py     BaseManager
    permissions.py  Permission names, role → permissions, can(), the membership cache
    graphql.py      current_user and the access decorators (@authorize, @owner_required, …)
    middleware.py   JWT → request.user
    audit.py        the audit log query
    testing.py      GraphQLTestCase
  <app>/
    models/
      __init__.py   re-exports every model and enum
      <model_name>/ model.py (table + its enums), queryset.py (filters + home_id_path),
                    manager.py (compositions, writes, value lookups)
    services.py     orchestration for writes
    types.py        GraphQL object types
    schema.py       GraphQL queries and mutations, each with an access decorator
    factories.py    test factories
    tests/          test_querysets.py, test_managers.py, test_services.py, test_schema.py
```

Apps: `accounts`, `homes`, `contractors`, `user_contractors`, `jobs`, `quotes`, `communications`, `ai`, `integrations`, plus `uploads` (services only, no models).

## The schema

Django owns it: default `<app>_<model>` table names, field-named columns, generated migrations.

- Primary keys are UUIDs (`uuid4`), exposed to GraphQL as `String!`.
- Choices are `CharField`s, not Postgres enum types.
- Timestamps are timezone-aware (`USE_TZ = True`, UTC).
- Join models (`UserHome`, `JobContractor`) have their own UUID id plus a unique constraint on the pair.

## Non-obvious patterns

- Passwords use Django's hashers through `User.set_password` / `check_password`. Refresh tokens are stored as SHA-256 digests (`core.hashing`), and only the latest one is valid.
- A malformed id (not a UUID) is never an internal error. `get_or_404` raises NOT_FOUND, `home_id_for` / `owner_id_for` return None (so `@authorize` answers FORBIDDEN), and anything else maps to BAD_REQUEST.
- Auth is stateless JWT, not Django sessions. `core.middleware.JWTAuthenticationMiddleware` sets `request.user`, and it runs **before** `AuditlogMiddleware` so audit entries have an actor.
- `convert_choices_to_enum = False` on every `DjangoObjectType`: outputs stay plain strings. Inputs use the explicit enums in `core/enums.py`.
- Types expose flat FK ids (`jobId`, `contractorId`) alongside nested objects, so a client can get an id without a nested selection.
- The permission cache is an optimisation, never the authority — if the cache backend is down, checks fall through to the database and the rate limiter fails open.
- `django.contrib.auth` is deliberately **not** installed: nothing uses Django's permissions, groups or admin, and leaving it out keeps those tables out of the database. `AUTH_USER_MODEL` still points at `accounts.User`.

## Commands

```bash
make migrate         # makemigrations + migrate, inside the container
make reset-db        # drop the local database volume (then make migrate && make seed)
make seed            # demo data
make test-api        # the full test suite
make graphql-schema  # write schema.graphql
```
