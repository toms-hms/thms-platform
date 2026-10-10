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
core/          shared plumbing: base querysets/managers, permission + storage services, S3 client, utils, GraphQL helpers, errors
<app>/         one Django app per domain
  models/        one folder per model: model.py, queryset.py, manager.py
  services/      <domain>_service.py — business logic and writes (classes)
  clients/       <vendor>_client.py — third-party SDK wrappers (classes)
  utils/         <topic>_utils.py — pure helper functions
  factories/     <model>_factory.py — test factories
  types.py       GraphQL object types
  schema.py      GraphQL queries and mutations
  tests/         queryset, manager, service and schema tests
```

See `.ai/context/api.md` for the conventions and `.ai/recipes/api/` for how to add each kind of file.
