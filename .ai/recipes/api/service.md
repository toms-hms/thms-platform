---
name: api-service
description: Guide for <app>/services/<name>_service.py — service classes that own business logic and writes; keyword-only methods, UNSET partial updates via apply_updates, collaborators (clients, other services) injected in __init__ with defaults.
---

# API Service

Services are where business logic lives. Every mutation calls one. Each service
is a class in `<app>/services/<name>_service.py`, named for the domain area it
owns: `quote_service.py` → `QuoteService`, `diagnose_service.py` → `DiagnoseService`.
Cross-app services (storage, permissions) live in `core/services/`.

```python
class QuoteService:
    """Records, edits and removes quotes."""

    def create(
        self,
        *,
        job_id: str,
        contractor_id: str,
        amount: Decimal | float,
        description: str | None = None,
        status: str | None = None,
    ) -> Quote:
        """Records a quote from a contractor against the job."""
        return Quote.objects.create(
            job_id=job_id, contractor_id=contractor_id, amount=amount,
            description=description, status=status or QuoteStatus.DRAFT,
        )

    def update(
        self,
        *,
        quote_id: str,
        amount: Decimal | float | Unset = UNSET,
        description: str | None | Unset = UNSET,
        status: str | Unset = UNSET,
    ) -> Quote:
        """Applies the provided fields. UNSET leaves a field alone; None clears the description."""
        quote = Quote.objects.get_or_404(pk=quote_id)
        return Quote.objects.apply_updates(quote, amount=amount, description=description, status=status)
```

## Methods

- **Every parameter after `self` is keyword-only (`*,`)** and explicitly typed. Never take `data: dict`.
- **Parameter names match the GraphQL argument names** (snake_case), so the mutation calls `QuoteService().update(quote_id=quote_id, **data)`.
- **Method names are verbs about the domain area:** `create`, `update`, `delete`, `promote`, `add_member`, `send`. The class already names the noun, so `QuoteService().create`, not `create_quote`.
- **Return the model instance written,** or `None` for a delete.
- Raise domain errors from `core.errors`. Never return an error value, never raise bare `Exception`.

## Partial updates: UNSET, not None

An update method defaults every optional field to `UNSET` (`core.utils.unset_utils`):

| Client sends | Service receives | Effect |
| --- | --- | --- |
| argument omitted | `UNSET` | field unchanged |
| `null` | `None` | nullable field cleared; required field → `VALIDATION_ERROR` |
| a value | the value | field set |

Always finish with `Model.objects.apply_updates(instance, field=value, ...)`. It
skips UNSET, enforces null rules, and saves only the changed columns (plus
`updated_at`). Never write a `for field in (...): setattr(...)` loop, and never
treat `None` as "not provided".

## Collaborators: injected in `__init__` with defaults

A service that uses a client or another service takes it as a keyword-only
constructor argument that defaults to the real one:

```python
class ImageGenerationService:
    """Generates an image, stores it as a job image and records the generation."""

    def __init__(self, *, openai: OpenAIClient | None = None, storage: StorageService | None = None) -> None:
        self.openai = openai or OpenAIClient()
        self.storage = storage or StorageService()
```

- Production code constructs services with no arguments: `ImageGenerationService().generate(...)`.
- Tests pass fakes: `ImageGenerationService(openai=MagicMock(spec=OpenAIClient))`.
- Constructing a service must be cheap. Clients create their SDK object on first use (see `client.md`).
- Managers, querysets and utils are **not** injected. Call them directly.

## What a service may call

- Other services, through constructor collaborators.
- Clients, through constructor collaborators. A vendor SDK is never imported in a service (see `client.md`).
- Managers and querysets of any app.
- Utils (see `utils.md`).

## What does not belong here

- **Access checks.** The resolver's decorator (`@authorize`, `@owner_required`) has already decided. A service assumes the caller may act.
- **Reads for GraphQL.** Queries and type fields read through managers and querysets directly. A service exists for writes and for reads that are part of business logic.
- **Query construction.** A chain of filters belongs on the queryset or manager.
- **Pure helpers** (prompt building, message encoding, payload shaping). Put them in `utils/`.

## Permission cache

Any write that creates, changes or removes a home membership calls
`PermissionService().invalidate(user_id=..., home_id=...)` for each affected member.
