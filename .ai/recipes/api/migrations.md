---
name: api-migrations
description: Guide for schema changes — one 0001_initial per app until the first deploy, generating migrations with makemigrations, checking for missing migrations, and when hand-written data migrations are allowed.
---

# Migrations

```bash
make migrate         # makemigrations + migrate inside the container
make migrate-deploy  # apply only — what runs in a deployed environment
make reset-db        # drop the local database volume; follow with make migrate && make seed
```

Django owns the schema. Every table, column, constraint and index comes from a
model, and every migration comes from `makemigrations`.

## One migration per app — until the first deploy

Nothing is deployed yet, so each app keeps a single `0001_initial.py`. A schema change folds into
it: delete the app's `0001_initial.py`, run `makemigrations <app>`, and commit the regenerated file.
Locally, recreate the database afterwards (`make reset-db && make migrate && make seed` — it wipes
local data, so ask first).

**Once an environment has applied a migration, it is never rewritten.** After the first deploy,
every schema change is a new migration generated beside the existing ones, as below.

## Changing the schema

1. Edit the model (see `model.md`).
2. Run `make migrate`. Commit the generated file in the app's `migrations/` alongside the model change.
3. Never edit a generated migration by hand. If the generated file is wrong, fix the model and regenerate.

Choices are plain `CharField(choices=...)`, so adding or removing a `TextChoices`
member needs a migration only because Django records `choices`. The column
type does not change, and there is no database enum type to alter.

## Hand-written migrations are for data, not structure

A data migration (backfilling a column, repairing rows) is legitimately hand-written
with `RunPython`. Give it a reverse function, or `migrations.RunPython.noop` when
there is nothing to undo. A structural change is never hand-written.

## Checking before you commit

```bash
DJANGO_ENV=test uv run python manage.py makemigrations --check --dry-run
```

This fails when a model change has no migration, which is exactly what CI should catch.
