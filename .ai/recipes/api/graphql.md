---
name: api-graphql
description: Guide for <app>/schema.py — queries, mutations, input enums, auth decorators and error codes. Object types live in types.py (see types.md).
---

# API GraphQL

Each app's `schema.py` holds its mutations and contributes a `Query` and a `Mutation` class; `config/schema.py` combines them. There are no routes and no request-validation schemas — the schema is the contract, and it validates input.

## Types

Object types live in `types.py`, not here. See `types.md`.

## Enums

Inputs are typed with the enums in `core/enums.py`, so an invalid value is rejected by the schema rather than by a service:

```python
class Arguments:
    category = TradeCategoryEnum(required=True)
    status = JobStatusEnum()
```

Add a new enum there with `graphene.Enum.from_enum(YourTextChoices)`.

## Mutations

```python
class CreateJob(graphene.Mutation):
    """Creates a job on a home the caller can access."""

    class Arguments:
        home_id = graphene.ID(required=True)
        title = graphene.String(required=True)
        category = TradeCategoryEnum(required=True)
        description = graphene.String()

    job = graphene.Field(JobType)

    @authorize(Permission.JOBS_EDIT, resource=Home, arg="home_id")
    def mutate(self, info, home_id: str, **data):
        """Creates the job on the home."""
        return CreateJob(job=services.create_job(home_id, current_user(info).pk, data))
```

- Names read as verbs: `createJob`, `assignContractor`, `disconnectIntegration`.
- A mutation returns the object it changed, or `success: Boolean!` for a delete.
- Arguments are flat, not input objects — they stay readable in GraphiQL and map straight onto service keyword arguments.
- Business logic lives in the service. The mutation declares access with a decorator, then delegates.
- Reads call a manager composition or a queryset chain directly. There is no service in between.

## Auth

Every resolver carries exactly one access decorator from `core.graphql`:

| Decorator | Effect | Error |
| --- | --- | --- |
| `@login_required` | Any authenticated caller | `UNAUTHORIZED` |
| `@admin_required` | Platform ADMIN only | `FORBIDDEN` |
| `@authorize(permission, resource=, arg=)` | Caller holds the permission in the named row's home | `FORBIDDEN` |
| `@owner_required(resource=, arg=)` | The named row belongs to the caller | `FORBIDDEN` |

The decorator handles authentication too. Do not stack `@login_required` under the others.
`current_user(info)` returns the authenticated user. See `permissioning.md` for choosing a
permission and for scoping collections with `visible_to`.

## Errors

Raise a domain error from `core.errors`; the view turns it into a GraphQL error carrying a stable `extensions.code`:

| Error | Code |
| --- | --- |
| `NotFoundError` | `NOT_FOUND` |
| `UnauthorizedError` | `UNAUTHORIZED` |
| `ForbiddenError` | `FORBIDDEN` |
| `ConflictError` | `CONFLICT` |
| `BadRequestError` | `BAD_REQUEST` |
| `ValidationError` | `VALIDATION_ERROR` |
| `RateLimitError` | `RATE_LIMITED` |

Anything else is logged server-side and returned as `INTERNAL_ERROR` with a generic message. Never put a database message, a stack trace or a provider response in an error a client sees.

## Naming across the boundary

List filters that can hold several values are plural arrays: `tradeCategories`, `zipCodes`. A client filtering by one category still sends `tradeCategories: [PLUMBING]`. Do not add singular aliases.
