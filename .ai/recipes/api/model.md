---
name: api-model
description: Guide for defining a Django model against the pre-existing schema — column mapping, CUID2 keys, Postgres enums, timestamps.
---

# API Model

Models map onto a database that already exists. The column names, types and constraints are fixed; the Python names are ours.

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
- **Enums are `PGEnumField(enum_type="…", choices=…)`** with a matching `TextChoices` class in the same file. The enum type must exist in `core/migrations/0001_enum_types.py`.
- **Timestamps are `TimestampField`** — naive `timestamp(3)`. Use `default=timezone.now` for `created_at` and `auto_now=True` for `updated_at`.
- **Nullable text columns keep `null=True`.** The API distinguishes null from empty string, so the usual Django advice does not apply here (ruff's DJ001 is disabled for this reason).
- A derived value that needs no query can be a `@property` (`Home.full_address`, `Contractor.zip_codes`). Anything that queries belongs in the manager.

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
