---
name: Stack decisions — Drizzle over Prisma, ORM rationale
description: Why Prisma was replaced by Drizzle; what Prisma artifacts remain; tradeoffs accepted
type: project
---

## Prisma → Drizzle migration

**Why we switched:** Prisma requires all models in a single `schema.prisma` file. This conflicts with the module-per-directory structure (`contractor/`, `job/`, `home/`) where each module owns its own files. Drizzle allows schema definitions to be colocated with the module — `contractor/models/Contractor.ts` defines the table and lives next to `ContractorManager.ts`.

**Status:** Migration is mostly complete. Prisma is no longer a dependency (`@prisma/client` not in package.json). Remaining artifacts are dead files that should be deleted:
- `apps/api/prisma/schema.prisma` — the old schema, kept for reference
- `apps/api/prisma/seed.ts` — the old seed script (replaced by `src/db/seed.ts`)

**What we accepted:** Drizzle is a query builder, not a full ORM. It doesn't provide a manager/queryset pattern out of the box. Django's `Model.objects.filter().filter()` chaining and built-in `BaseManager` have to be implemented manually on top of Drizzle (see `src/utils/BaseManager.ts` and the manager skill). Prisma's `findMany({ where: { ... } })` is more ergonomic for common cases but less composable without its own builder pattern.

**Key difference from Prisma:** In Drizzle, each table is defined as a `pgTable()` export in its own file. `db/schema.ts` re-exports all tables so drizzle-kit can find them for migrations. Do not consolidate table definitions back into a single file.
