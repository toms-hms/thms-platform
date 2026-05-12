# Migrations

## Always generate schema migrations with drizzle-kit

When adding, removing, or renaming a column or table, never write the SQL by hand. Run:

```bash
cd apps/api
npm run db:generate
```

This diffs `src/db/schema.ts` against the last snapshot in `drizzle/` and produces a timestamped SQL file in `drizzle/`. Commit that file alongside the schema change.

## When to write a custom migration instead

Only write raw SQL when the change cannot be expressed as a schema diff:

- Data backfills (e.g. populating a new column from existing data)
- Multi-step renames that need to preserve data mid-flight
- Index creation with non-default options
- Triggers, functions, or other DB objects Drizzle doesn't model

Custom migrations still go in `drizzle/` with a sequential prefix so they run in order.

## Workflow

1. Edit the Drizzle model in `src/<module>/models/<Model>.ts`
2. Run `npm run db:generate` — review the generated SQL before committing
3. Commit both the model change and the generated migration file together
4. To apply: `npm run db:migrate` (runs all pending migrations)
