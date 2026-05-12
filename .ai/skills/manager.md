# Manager patterns

Managers are the data access layer. They own all DB queries for their module. Rules:

## Manager structure

Every manager is a class extending `BaseManager<TTable>` (from `src/utils/BaseManager.ts`), exported as a singleton:

```typescript
class ContractorManagerClass extends BaseManager<typeof contractors> {
  readonly table: typeof contractors = contractors;
  // module-specific methods
}
export const ContractorManager = new ContractorManagerClass();
```

**`readonly table` must be annotated explicitly with `typeof <table>`.** Without the annotation, TS infers the literal Drizzle table type — which references internal `PgColumn` / `PgColumnBuilder` / `PgTableWithColumns` types that aren't directly importable, and `declaration: true` emit fails with TS2883. The `typeof <table>` annotation is portable because the table value is imported in the same file.

`BaseManager` provides a generic `get(where)` method — a typed single-record lookup from partial model fields:
```typescript
await ContractorManager.get({ id: '123' })
await ContractorManager.get({ email: 'joe@example.com' })
await ContractorManager.get({ id: '123', name: 'Smith' }) // AND conditions
```

## Composing multi-field queries — predicate helpers

A Manager method that filters by N optional fields is composed from N predicate helper functions, each returning `SQL | undefined`. The Manager method assembles them with `and(...)` and runs the query once. This is Drizzle's recommended composition pattern — fully typed, no chain accumulator, no class boilerplate.

### File layout

Predicate helpers always live in a sibling file `<Name>Manager.where.ts`, imported into the Manager as `import * as where from './<Name>Manager.where'`. Always extract, even at one or two helpers. The convention beats the threshold judgment call: every Manager with predicates has a paired `.where.ts` file, so finding them is mechanical.

```typescript
// apps/api/src/contractor/models/ContractorManager.where.ts
import { arrayContains, eq, ilike, inArray, or, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import { TradeCategory } from '@thms/shared';
import { contractors } from './Contractor';
import { contractorZipCodes } from './ContractorZipCode';

// Predicate helpers — return `SQL | undefined` for composition inside `and(...)`.
// `filter<Field>` narrows by an exact attribute. `search` is a fuzzy multi-column
// ILIKE OR — not a filter. Each helper is a no-op when its argument is undefined
// so the manager method passes request query params unconditionally.

export function filterZipCode(zipCode?: string): SQL | undefined {
  if (!zipCode) return undefined;
  const subq = db
    .select({ contractorId: contractorZipCodes.contractorId })
    .from(contractorZipCodes)
    .where(eq(contractorZipCodes.zipCode, zipCode));
  return inArray(contractors.id, subq);
}

export function filterCategory(category?: TradeCategory): SQL | undefined {
  return category ? arrayContains(contractors.categories, [category]) : undefined;
}

export function filterEmail(email?: string): SQL | undefined {
  return email ? ilike(contractors.email, email) : undefined;
}

export function search(query?: string): SQL | undefined {
  if (!query) return undefined;
  const q = `%${query}%`;
  return or(
    ilike(contractors.name, q),
    ilike(contractors.companyName, q),
    ilike(contractors.email, q),
  );
}
```

```typescript
// apps/api/src/contractor/models/ContractorManager.ts
import * as where from './ContractorManager.where';

interface FilterOpts {
  zipCode?: string;
  category?: TradeCategory;
  email?: string;
  search?: string;
}

class ContractorManagerClass extends BaseManager<typeof contractors> {
  readonly table: typeof contractors = contractors;

  async filter({ zipCode, category, email, search }: FilterOpts = {}): Promise<Contractor[]> {
    return db.select().from(contractors).where(and(
      where.filterZipCode(zipCode),
      where.filterCategory(category),
      where.filterEmail(email),
      where.search(search),
    ));
  }
}
```

### `filter<Field>` vs `search`

- **`filter<Field>`** — exact predicate against one column or relation. Each `filter*` narrows the result set in a precise way. Single-field exact-match lookups (e.g. `filterEmail`) are predicate helpers too — call via `Manager.filter({ email })`, not a separate Manager method.
- **`search`** — fuzzy text match across multiple columns using a single `OR` of `ILIKE`. Not prefixed `filter*` because it isn't narrowing by an exact attribute. One query, never composed from single-field text matches.

### Optional-arg pattern

Every predicate helper accepts an optional argument and returns `undefined` when absent. `and(...)` skips `undefined` natively, so the Manager method passes request query params unconditionally without null checks. The `Manager.filter` signature destructures `FilterOpts` directly — the `where` namespace prevents parameter names like `search` from shadowing the helper.

### Why not a chainable QuerySet class

A `<Model>Query` accumulator (Django/Rails style) has been considered and rejected:

- Drizzle's `or()` / `and()` return `SQL | undefined`, so a chainable accumulator requires `as SQL` casts.
- Storing conditions in `SQL[]` throws away Drizzle's per-step type narrowing — every helper operates on raw conditions instead of the typed query builder.
- Each Manager needs its own `<Model>Query` class, with duplicated `whereClause()` / `all()` / `first()` boilerplate (or a base class that adds indirection).
- The pattern solves a problem TypeScript + Drizzle don't have. Predicate-helper composition is what Drizzle's own docs recommend for this case.

## Manager methods (non-read)

The Manager class exposes these methods alongside the unified `filter(opts)` read entry point:

- **`get({ field: value })`** — inherited from `BaseManager`, throws `NotFoundError` if not found. Use only when you expect the record to exist (e.g. ID-based lookups behind a `permit()` middleware). For "does this exist?" lookups, use `filter({ field: value })` — it returns an empty array on miss instead of throwing.
- **`create` / `update` / `delete`** — mutations. Return the bare affected entity.
- **`hasPermission` / `listForUser`** — required stubs for the permissioning framework. These names are fixed by the framework contract. Do not rename them.

There are no per-field eager read methods on the Manager. Single-field exact-match lookups are predicate helpers in `.where.ts` and are invoked through `filter({ field: value })`.

## `attach<Object>` for relations

Enriches an existing list of bare records with a related entity via one batched DB query.

- Takes an array of bare records, returns them with the relation populated.
- Always one `WHERE id IN (...)` query — never query inside a loop.
- Called by the route or service, never by a predicate helper or a Manager read method.
- Example: `attachZipCodes(contractors)` — one query for all zip codes, distributed in memory.

## Core principles

- **Read methods return bare entities.** Never call `attach*` inside a predicate helper or a Manager read method. The caller decides what relations it needs and pays for them explicitly.
- **Always DB, never in-memory.** Filtering, sorting, and grouping belong in SQL. The only in-memory work allowed in a manager is distributing already-fetched results (e.g. grouping zip codes by contractor ID after a batched `IN` query).
- **No N+1 queries.** Never query inside a loop. Fetch related data for N records in one `WHERE id IN (...)` query.

## Data flow

- **GET routes → Manager directly.** Routes own reads. Call Manager methods and `attach*` inline — no service wrapper.
- **Mutation routes → Service → Manager.** Services own business logic for writes: orchestration, validation, error handling.

```typescript
// Route — GET detail, calls manager directly, attaches zip codes
router.get('/:id', permit(...), async (req, res, next) => {
  const contractor = await ContractorManager.get({ id: req.params.id });
  const [withZips] = await attachZipCodes([contractor]);
  res.json({ data: withZips });
});

// Route — GET list, no zip codes needed, no service involved
router.get('/', async (req, res, next) => {
  const { search, zipCode, category } = req.query as { /* ... */ };
  const result = await ContractorManager.filter({ zipCode, category, search });
  res.json({ data: result });
});

// Service — mutation only, handles orchestration
export async function createContractor(data: CreateContractorInput) {
  const contractor = await ContractorManager.create(...);
  const [withZips] = await attachZipCodes([contractor]);
  return withZips;
}
```

## BAD vs GOOD

```typescript
// BAD — Manager read method calls attach* internally; every caller pays for zip codes
async filter(opts: FilterOpts = {}): Promise<ContractorWithRelations[]> {
  const rows = await db.select().from(contractors).where(and(/* ... */));
  return attachZipCodes(rows); // hidden cost
}

// GOOD — Manager read method returns bare entities; caller attaches when needed
async filter(opts: FilterOpts = {}): Promise<Contractor[]> {
  return db.select().from(contractors).where(and(/* ... */));
}
```
