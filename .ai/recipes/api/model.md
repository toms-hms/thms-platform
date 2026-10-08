---
name: api-model
description: Guide for <app>/models/<model_name>/model.py — fields, UUID primary keys, TextChoices, timestamps, foreign keys and on_delete rules, constraints, and re-export from models/__init__.py.
---

# API Model

Django owns the schema: table and column names are Django's defaults, and migrations are generated from the models.

Each model lives in `models/<model_name>/model.py`. The model folder's `queryset.py` and
`manager.py` sit next to it. The app's `models/__init__.py` re-exports it (see
`file-structure.md`). `model.py` imports only its own manager
(`from jobs.models.job.manager import JobManager`). Foreign keys name other models as strings.

## The shape of a model

```python
class Job(models.Model):
    """A piece of work on a home."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    home = models.ForeignKey("homes.Home", on_delete=models.CASCADE, related_name="jobs")
    created_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT, related_name="created_jobs")
    title = models.TextField()
    intent = models.CharField(max_length=32, choices=JobIntent.choices, default=JobIntent.ISSUE)
    description = models.TextField(null=True, blank=True)
    ai_session = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    objects = JobManager()

    class Meta:
        ordering = ["-created_at"]
```

## Rules

- **No `db_table` or `db_column`.** Tables are Django's `<app>_<model>` and columns are the field names.
- **Primary keys are `models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`.** Every model, including join models. GraphQL exposes them as `String!` (see `core/converters.py`).
- **A join model gets its own UUID `id`** plus a `UniqueConstraint` on the pair. No composite primary keys.
- **Choices are `models.CharField(max_length=32, choices=X.choices)`** with the `TextChoices` class in the `model.py` of the model that owns it. Add it to `models/__init__.py` and expose it in `core/enums.py`.
- **Timestamps are `models.DateTimeField`.** `USE_TZ` is on, so values are timezone-aware UTC. Use `default=timezone.now` for `created_at` and `auto_now=True` for `updated_at`. Never use `datetime.now()` / `utcnow()`.
- **Foreign keys use a string target** (`"homes.Home"`), including for a model in the same app. This keeps `model.py` files from importing each other.
- **Every foreign key states its `on_delete` deliberately:**
  - `CASCADE` for children that make no sense without the parent (quotes, images and messages under a job).
  - `SET_NULL` (with `null=True`) for optional references.
  - `PROTECT` for authorship and history (`created_by`, a quote's contractor). The service that deletes the parent turns `ProtectedError` into `ConflictError`.
  - Never `DO_NOTHING`.
- **Constraint names are lowercase `<model>_<fields>_unique`.**
- **Nullable text columns keep `null=True`.** The API distinguishes null from empty string, so the usual Django advice does not apply here (ruff's DJ001 is disabled for this reason).
- **Store ids in JSON as strings.** A UUID in a `JSONField` or JWT claim raises at serialization time, so use `str(obj.pk)`.
- A derived value that needs no query can be a `@property` (`Home.full_address`, `Contractor.zip_codes`). Anything that queries belongs in the queryset or manager.

## Choices

```python
class JobStatus(models.TextChoices):
    """Where the job sits in its lifecycle. Only the user moves a job between states."""

    DRAFT = "DRAFT", "Draft"
    PLANNING = "PLANNING", "Planning"
```

Use the member, never the literal: `JobStatus.DRAFT`, not `"DRAFT"`. Expose it to GraphQL by adding it to `core/enums.py`. Adding a member is a code change plus a generated migration (see `migrations.md`).

## Registering with the audit log

In the app's `AppConfig.ready()`:

```python
def ready(self) -> None:
    """Registers this app's models with the audit log."""
    from auditlog.registry import auditlog

    from jobs.models import Job

    auditlog.register(Job, exclude_fields=["updated_at"])
```

Exclude anything secret — password hashes, encrypted tokens — and `updated_at`, which changes on every write and says nothing.
