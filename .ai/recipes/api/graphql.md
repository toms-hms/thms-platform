---
name: api-graphql
description: Guide for the GraphQL surface — types, queries, mutations, enums, auth decorators and error codes. Replaces the old route and Zod schema recipes.
---

# API GraphQL

Each app's `schema.py` contributes a `Query` and a `Mutation` class; `config/schema.py` combines them. There are no routes and no request-validation schemas — the schema is the contract, and it validates input.

## Types

```python
class JobType(DjangoObjectType):
    """A piece of work on a home, with everything hanging off it."""

    ai_session = graphene.JSONString()
    home_id = graphene.ID(required=True)
    quotes = graphene.List(graphene.NonNull("quotes.schema.QuoteType"), required=True)

    class Meta:
        model = Job
        fields = ("id", "home", "title", "intent", "category", "status", "created_at", "updated_at")
        convert_choices_to_enum = False

    def resolve_home_id(self, info) -> str:
        """Returns the id of the home this job belongs to."""
        return self.home_id
```

- **Always list `fields` explicitly.** A field nobody named cannot leak — that is how password hashes and encrypted tokens stay out of the schema.
- **Always set `convert_choices_to_enum = False`.** Enum-backed fields come out as plain strings, matching what clients already compare against.
- **Expose flat FK ids** (`job_id`, `contractor_id`) next to the nested object, so a client that only wants an id does not have to select a whole object.
- Relations are fields on the type. Let the client ask for what it needs instead of assembling composite payloads server-side.
- Cross-app references use a string (`"quotes.schema.QuoteType"`) to avoid an import cycle.

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

    @login_required
    def mutate(self, info, home_id: str, **data):
        """Creates the job after checking the caller's access to the home."""
        user = current_user(info)
        permissions.require(Home.objects, user.pk, home_id)
        return CreateJob(job=services.create_job(home_id, user.pk, data))
```

- Names read as verbs: `createJob`, `assignContractor`, `disconnectIntegration`.
- A mutation returns the object it changed, or `success: Boolean!` for a delete.
- Arguments are flat, not input objects — they stay readable in GraphiQL and map straight onto service keyword arguments.
- Business logic lives in the service. The mutation authenticates, authorises, and delegates.

## Auth

| Decorator | Effect | Error |
| --- | --- | --- |
| `@login_required` | Requires a valid bearer token | `UNAUTHORIZED` |
| `@admin_required` | Requires the ADMIN role | `FORBIDDEN` |
| `permissions.require(...)` | Requires access to one row | `FORBIDDEN` |

`current_user(info)` returns the authenticated user and raises `UnauthorizedError` when there is none.

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
