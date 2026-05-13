---
name: api-migrations
description: Guide for generating and applying Drizzle migrations — when to generate vs hand-write, and workflow steps.
---

# API Migrations

## Always generate schema migrations with drizzle-kit

When adding, removing, or renaming a column or table, never write the SQL by hand. Run:

```bash
cd apps/api
npm run db:generate
```

This diffs `src/db/schema.ts` against the last snapshot in `drizzle/` and produces a timestamped SQL file. Commit that file alongside the schema change.

## When to write a custom migration instead

Only write raw SQL when the change cannot be expressed as a schema diff:

- Data backfills (populating a new column from existing rows)
- Multi-step renames that need to preserve data mid-flight
- Index creation with non-default options
- Triggers, functions, or other DB objects Drizzle doesn't model

Custom migrations still go in `drizzle/` with a sequential prefix so they run in order.

## Workflow

1. Edit the Drizzle model in `src/{module}/models/<Model>.ts`
2. Add the table export to `src/db/schema.ts` if it's a new table
3. Run `npm run db:generate` — review the generated SQL before committing
4. Commit both the model change and the generated migration file together
5. To apply: `npm run db:migrate` (or `make migrate` from project root)

## Example: adding a nullable column

```typescript
// 1. Edit the model
export const contractors = pgTable('Contractor', {
  // ... existing fields
  website: text('website'),   // new nullable column
});

// 2. Generate
// cd apps/api && npm run db:generate
// → drizzle/0012_add_contractor_website.sql

// 3. Review the generated SQL — should look like:
// ALTER TABLE "Contractor" ADD COLUMN "website" text;
```

Never add `.notNull()` to a new column without a migration-time default — Postgres will reject the migration on a populated table.
