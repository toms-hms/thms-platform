---
name: api-service
description: Guide for <app>/services/<name>_service.py — service classes that own business logic and writes; keyword-only methods, UNSET partial updates via apply_updates, collaborators (managers, clients, other services) injected in __init__ with defaults.
---

# API Service

Services are where business logic lives. Every mutation calls one. Each service
is a class in `<app>/services/<name>_service.py`, named for the domain area it
owns: `quote_service.py` → `QuoteService`, `diagnose_service.py` → `DiagnoseService`.
Cross-app services (storage, permissions) live in `core/services/`.

```python
class QuoteService:
    """Records, edits and removes quotes."""

    def __init__(self, *, quote_manager: QuoteManager | None = None) -> None:
        self._quote_manager = quote_manager or Quote.objects

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
        return self._quote_manager.create(
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
        quote = self._quote_manager.find(pk=quote_id)
        if quote is None:
            raise NotFoundError("Quote")
        return self._quote_manager.apply_updates(quote, amount=amount, description=description, status=status)
```

## Methods

- **Every parameter after `self` is keyword-only (`*,`)** and explicitly typed. Never take `data: dict`.
- **Parameter names match the GraphQL argument names** (snake_case), so the mutation calls `QuoteService().update(quote_id=quote_id, **data)`.
- **A model service owns one model** and is named after it: `QuoteService`, `UserHomeService`. Its writes are plain `create`, `update` and `delete` (the class names the noun, so `QuoteService().create`, never `create_quote` and never `add` / `assign` / `record` / `remove`). CRUD on a second model means a second service: `HomeService` creates the owner's membership by calling an injected `UserHomeService`, not by owning member methods.
- **Real domain actions keep their verb** alongside the CRUD: `promote`, `send`, `connect_google`. A create that comes in variants takes keyword alternatives (`UserHomeService.create(user_id=... | email=...)`) rather than growing a second create.
- **Services that aren't about one model** (`AuthService`, `DiagnoseService`, `EmailDraftService`, `ImageGenerationService`, `EmailService`, `StorageService`, `PermissionService`) are named for what they do and use action verbs. They may write through an injected manager's named call (`self._job_image_manager.create(...)`) rather than another model's service.
- **Return the model instance written,** or `None` for a delete.
- Raise domain errors from `core.errors`. Never return an error value, never raise bare `Exception`.

## Partial updates: UNSET, not None

An update method defaults every optional field to `UNSET` (`core.utils.unset_utils`):

| Client sends | Service receives | Effect |
| --- | --- | --- |
| argument omitted | `UNSET` | field unchanged |
| `null` | `None` | nullable field cleared; required field → `VALIDATION_ERROR` |
| a value | the value | field set |

Always finish with `self._<model>_manager.apply_updates(instance, field=value, ...)`. It
skips UNSET, enforces null rules, and saves only the changed columns (plus
`updated_at`). Never write a `for field in (...): setattr(...)` loop, and never
treat `None` as "not provided".

## Collaborators: injected in `__init__` with defaults

A service takes every manager, client and other service it uses as a keyword-only
constructor argument that defaults to the real one:

```python
class ImageGenerationService:
    """Generates an image, stores it as a job image and records the generation."""

    def __init__(
        self,
        *,
        openai: OpenAIClient | None = None,
        storage_service: StorageService | None = None,
        ai_generation_manager: AIGenerationManager | None = None,
        job_image_manager: JobImageManager | None = None,
    ) -> None:
        self._openai = openai or OpenAIClient()
        self._storage_service = storage_service or StorageService()
        self._ai_generation_manager = ai_generation_manager or AIGeneration.objects
        self._job_image_manager = job_image_manager or JobImage.objects
```

- **Names:** managers are `<model>_manager` (`self._job_manager`), services are
  `<name>_service` (`self._storage_service`), clients are the vendor (`self._openai`).
- **No `Model.objects` in a service method body.** The constructor default is the only place a
  service names `Model.objects`, so its constructor lists everything it reads and writes.

- Production code constructs services with no arguments: `ImageGenerationService().generate(...)`.
- Tests pass fakes: `ImageGenerationService(openai=MagicMock(spec=OpenAIClient))`.
- Collaborators are stored as private attributes (`self._openai`), never public ones.
- Constructing a service builds its clients, and a client checks its configuration as it is built (see `client.md`). Construct services inside the resolver that uses them, never at module level.
- Utils are **not** injected. Call them directly.
- Tests normally keep the real managers and the test database; fake a manager only where the real one cannot be used.

## What a service may call

- Other services, through constructor collaborators.
- Clients, through constructor collaborators. A vendor SDK is never imported in a service (see `client.md`).
- **One named call on an injected manager per lookup or write**, on any app's model: `find`, `create`, `upsert`, `apply_updates`, `filter_existing`, `replace_for_contractor`. A chain (`.filter(...).exists()`, `.filter_x(...).delete()`, `.values_list(...)`) is a manager method, never inline in a service.
- Deletes go through the manager too: `self._job_manager.delete(job)`. A service never calls a method on a model instance (`job.delete()`, `job.save()`).
- Utils (see `utils.md`).

## What does not belong here

- **Access checks.** The resolver's decorator (`@authorize`, `@owner_required`) has already decided. A service assumes the caller may act.
- **Reads for GraphQL.** Queries and type fields read through managers and querysets directly. A service exists for writes and for reads that are part of business logic.
- **Query construction.** A chain of queryset calls belongs in a named manager method. Resolvers may chain querysets for reads; services may not.
- **Deciding a missing row is a 404 in the repo layer.** Load with `find`, and raise `NotFoundError("Quote")` here when the row must exist.
- **Pure helpers** (prompt building, message encoding, payload shaping). Put them in `utils/`.

## Permission cache

Any write that creates, changes or removes a home membership calls
`PermissionService().invalidate(user_id=..., home_id=...)` for each affected member.
