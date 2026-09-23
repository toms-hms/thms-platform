# THMS API

Django + Graphene GraphQL API for the THMS platform.

## Running

The API runs inside Docker as part of the monorepo's compose stack:

```bash
make run          # start everything
make logs-api     # follow this service
make migrate      # apply migrations
make seed         # load demo data
make test-api     # run the test suite
```

## Endpoints

| Path | What it is |
| --- | --- |
| `POST /graphql` | The entire API. GraphiQL is served at the same path in development. |
| `GET /health` | Liveness probe. |
| `GET /api/v1/integrations/email/{google,microsoft}/callback` | OAuth redirect targets. Not GraphQL because the provider redirects a browser here. |

## Layout

```
config/        settings, URL routing, the GraphQL view and the schema root
core/          shared plumbing: fields, errors, permissions, JWT, crypto, audit
<app>/         one Django app per domain
  models.py      tables, mapped onto the pre-existing schema
  managers.py    query methods and the permission predicates
  services.py    orchestration
  schema.py      GraphQL types, queries and mutations
  factories.py   test factories
  tests/         manager, service and schema tests
```

See `.ai/context/api.md` for the conventions and `.ai/recipes/api/` for how to add each kind of file.
