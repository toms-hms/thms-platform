---
name: api-model
description: Guide for <app>/models/<model_name>/model.py — a Django model against the pre-existing schema: column mapping, CUID2 keys, Postgres enums, timestamps, re-export from models/__init__.py.
---

# API Model

Models map onto a database that already exists. The column names, types and constraints are fixed; the Python names are ours.

Each model lives in `models/<model_name>/model.py`. The model folder's `queryset.py` and
`manager.py` sit next to it. The app's `models/__init__.py` re-exports it (see
`file-structure.md`). `model.py` imports only its own manager
(`from jobs.models.job.manager import JobManager`). Foreign keys name other models as strings.

## The shape of a model

```python
class Job(models.Model):
    """A piece of work on a home."""

    id = CuidField(default=create_id)
    home = models.ForeignKey("homes.Home", on_delete=models.CASCADE, db_column="homeId", related_name="jobs")
    title = models.TextField()
    intent = PGEnumField(enum_type="JobIntent", choices=JobIntent.choices, default=JobIntent.ISSUE)
    description = models.TextField(null=True, blank=True)
    ai_session = models.JSONField(db_column="ai_session", null=True, blank=True)
    created_at = TimestampField(db_column="createdAt", default=timezone.now)
    updated_at = TimestampField(db_column="updatedAt", auto_now=True)

    objects = JobManager()

    class Meta:
        db_table = "Job"
        ordering = ["-created_at"]
```

## Rules

- **Always set `db_table`.** It is the real table name, usually PascalCase.
- **Always set `db_column`** when the Python name differs from the column — which is most of the time. Foreign keys carry the `…Id` column name.
- **Primary keys are `CuidField(default=create_id)`.** The application generates ids; the database has no default and no sequence.
- **Enums are `PGEnumField(enum_type="…", choices=…)`** with a matching `TextChoices` class in the `model.py` of the model that owns it. Add it to `models/__init__.py` too. The enum type must exist in `core/migrations/0001_enum_types.py`.
- **Timestamps are `TimestampField`** — naive `timestamp(3)`. Use `default=timezone.now` for `created_at` and `auto_now=True` for `updated_at`.
- **Nullable text columns keep `null=True`.** The API distinguishes null from empty string, so the usual Django advice does not apply here (ruff's DJ001 is disabled for this reason).
- **Foreign keys use a string target** (`"homes.Home"`), including for a model in the same app. This keeps `model.py` files from importing each other.
- A derived value that needs no query can be a `@property` (`Home.full_address`, `Contractor.zip_codes`). Anything that queries belongs in the queryset or manager.

## Choices

```python
class JobStatus(models.TextChoices):
    """Where the job sits in its lifecycle. Only the user moves a job between states."""

    DRAFT = "DRAFT", "Draft"
    PLANNING = "PLANNING", "Planning"
```

Use the member, never the literal: `JobStatus.DRAFT`, not `"DRAFT"`. Expose it to GraphQL by adding it to `core/enums.py`.

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
