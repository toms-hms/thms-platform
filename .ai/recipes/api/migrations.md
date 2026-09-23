---
name: api-migrations
description: Guide for schema changes — generating migrations, adopting the pre-existing database, and adding Postgres enum types or values.
---

# Migrations

```bash
make migrate         # makemigrations + migrate inside the container
make migrate-deploy  # apply only — what runs in a deployed environment
make migrate-adopt   # first run against a database the previous API created
```

Never hand-write a migration for a schema change. Edit the model, then generate.

## Adopting the existing database

The tables predate Django, so the initial migrations describe tables that are already there. On such a database run `make migrate-adopt` once — `--fake-initial` records the initial migrations without re-creating anything. Everything after that is an ordinary `make migrate`.

A fresh database (a test run, a new environment) builds the whole schema from the same migrations, so the two stay identical.

## Postgres enum types

The schema uses native enum types, which Django does not manage. They are created by `core/migrations/0001_enum_types.py`, and **every app's initial migration depends on it**.

To add a **new** enum type:

1. Add it to `ENUMS` in `core/migrations/0001_enum_types.py` — the migration is written to skip types that already exist, so it stays safe to re-run.
2. Declare the field with `PGEnumField(enum_type="YourType", choices=YourChoices.choices)`.
3. Make sure the app's migration depends on `("core", "0001_enum_types")`.

To add a **value** to an existing enum, write a new migration with `ALTER TYPE`, because Postgres cannot do it implicitly:

```python
operations = [
    migrations.RunSQL(
        sql='ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS \'ON_HOLD\';',
        reverse_sql=migrations.RunSQL.noop,  # Postgres cannot drop an enum value
    )
]
```

Then add the member to the `TextChoices` class in the same change.

## Hand-written SQL is for data, not structure

A data migration (backfilling a column, repairing rows) is legitimately hand-written. A structural change is not — generate it.

## Checking before you commit

```bash
DJANGO_ENV=test uv run python manage.py makemigrations --check --dry-run
```

This fails when a model change has no migration, which is exactly what CI should catch.
