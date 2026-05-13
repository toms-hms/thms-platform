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

`BaseManager` provides a generic `get(where)` method — a typed single-record lookup from partial model fields that throws `NotFoundError` if not found:

```typescript
await ContractorManager.get({ id: '123' })
await ContractorManager.get({ id: '123', name: 'Smith' }) // AND conditions
```

Use `get` only when you expect the record to exist (e.g. ID-based lookups behind a `permit()` middleware). For "does this exist?" lookups, use `filter({...})` — it returns an empty array on miss instead of throwing.

## Composing multi-field queries — predicate helpers

A Manager method that filters by N optional fields is composed from N predicate helper functions, each returning `SQL | undefined`. The Manager method assembles them with `and(...)` and runs the query once. This is Drizzle's recommended composition pattern — fully typed, no chain accumulator, no class boilerplate.

### File layout

Predicate helpers always live in a sibling file `<Name>Manager.where.ts`, imported into the Manager as `import * as where from './<Name>Manager.where'`. Always extract, even at one or two helpers. The convention beats the threshold judgment call: every Manager with predicates has a paired `.where.ts` file, so finding them is mechanical.

### Predicate naming — always plural, value-bearing, explicit

Every value-bearing predicate name is **plural** and takes an **array**. There are no singular value-bearing predicates. When a caller has only one value, it wraps it in `[value]` at the call site.

The rule eliminates a class of bugs where a route adds a "filter by multiple X" feature and grows a parallel plural method alongside the singular one (we had `filterZipCode` *and* `filterZipCodes` for two days until this rule landed).

Names use the *type* of the value, not a generic noun. `filterTradeCategories`, not `filterCategory` — the latter is ambiguous (job category? trade category? CSS category?). Be specific.

| Predicate                                                    | Notes                                                                                   |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `filterIds(ids?: string[])`                                  | By primary key list. Empty array matches nothing (returns `sql\`1 = 0\``).              |
| `filterZipCodes(zipCodes?: string[])`                        | Contractor serves any of these zip codes (subquery on the join table).                  |
| `filterTradeCategories(tradeCategories?: TradeCategory[])`   | Any of the contractor's categories is in the given list (`arrayOverlaps`).              |
| `filterEmails(emails?: string[])`                            | Case-insensitive — `OR` of `ILIKE`s.                                                    |

Exempt from the plural rule:

- **Boolean predicates** (`filterIsGlobal(isGlobal?: boolean)`) — there's no array-of-booleans semantic; the value is a flag.
- **`search`** — not a filter and not plural-named. It's a single fuzzy query string used in an OR over multiple columns; "search by a list of queries" isn't a coherent operation.

### Empty array vs undefined

Every predicate accepts an optional argument and returns `undefined` when absent — the predicate is a no-op. `and(...)` skips `undefined` natively, so the Manager method passes request query params unconditionally without null checks.

When the argument is an **empty array**, that's semantically different from `undefined`:

- `undefined` = "I'm not filtering by this attribute at all" → no-op.
- `[]` = "I'm filtering for matches in this empty set" → match nothing → `sql\`1 = 0\``.

This matters for route handlers that build filter lists conditionally: passing `[]` for "no values to match" produces zero results, not all results.

### Example

```typescript
// apps/api/src/contractor/models/ContractorManager.where.ts
import { arrayOverlaps, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import { TradeCategory } from '@thms/shared';
import { contractors } from './Contractor';
import { contractorZipCodes } from './ContractorZipCode';

// Predicate helpers — return `SQL | undefined` for composition inside `and(...)`.
// Value-bearing predicates are plural and take arrays. Boolean predicates
// (filterIsGlobal) and `search` are exempt.

export function filterIds(ids?: string[]): SQL | undefined {
  if (ids === undefined) return undefined;
  if (ids.length === 0) return sql`1 = 0`;
  return inArray(contractors.id, ids);
}

export function filterZipCodes(zipCodes?: string[]): SQL | undefined {
  if (zipCodes === undefined) return undefined;
  if (zipCodes.length === 0) return sql`1 = 0`;
  const subq = db
    .select({ contractorId: contractorZipCodes.contractorId })
    .from(contractorZipCodes)
    .where(inArray(contractorZipCodes.zipCode, zipCodes));
  return inArray(contractors.id, subq);
}

export function filterTradeCategories(tradeCategories?: TradeCategory[]): SQL | undefined {
  if (tradeCategories === undefined) return undefined;
  if (tradeCategories.length === 0) return sql`1 = 0`;
  return arrayOverlaps(contractors.categories, tradeCategories);
}

export function filterEmails(emails?: string[]): SQL | undefined {
  if (emails === undefined) return undefined;
  if (emails.length === 0) return sql`1 = 0`;
  return or(...emails.map((e) => ilike(contractors.email, e)));
}

export function filterIsGlobal(isGlobal?: boolean): SQL | undefined {
  return isGlobal === undefined ? undefined : eq(contractors.isGlobal, isGlobal);
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
  ids?: string[];
  zipCodes?: string[];
  tradeCategories?: TradeCategory[];
  emails?: string[];
  isGlobal?: boolean;
  search?: string;
}

class ContractorManagerClass extends BaseManager<typeof contractors> {
  readonly table: typeof contractors = contractors;

  async filter({
    ids, zipCodes, tradeCategories, emails, isGlobal, search,
  }: FilterOpts = {}): Promise<Contractor[]> {
    return db.select().from(contractors).where(and(
      where.filterIds(ids),
      where.filterZipCodes(zipCodes),
      where.filterTradeCategories(tradeCategories),
      where.filterEmails(emails),
      where.filterIsGlobal(isGlobal),
      where.search(search),
    ));
  }
}
```

### `filter<Field>` vs `search`

- **`filter<Field>`** — exact predicate against one column or relation, plural-named, array-valued. Each `filter*` narrows the result set in a precise way. Single-field exact-match lookups (e.g. `filterEmails`) live as predicate helpers — call via `Manager.filter({ emails: [...] })`, not as a separate Manager method.
- **`search`** — fuzzy text match across multiple columns using a single `OR` of `ILIKE`. Not prefixed `filter*` because it isn't narrowing by an exact attribute. One query, never composed from single-field text matches.

### Why not a chainable QuerySet class

A `<Model>Query` accumulator (Django/Rails style) has been considered and rejected:

- Drizzle's `or()` / `and()` return `SQL | undefined`, so a chainable accumulator requires `as SQL` casts.
- Storing conditions in `SQL[]` throws away Drizzle's per-step type narrowing — every helper operates on raw conditions instead of the typed query builder.
- Each Manager needs its own `<Model>Query` class, with duplicated `whereClause()` / `all()` / `first()` boilerplate (or a base class that adds indirection).
- The pattern solves a problem TypeScript + Drizzle don't have. Predicate-helper composition is what Drizzle's own docs recommend for this case.

## Manager methods (non-read)

The Manager class exposes these methods alongside the unified `filter(opts)` read entry point:

- **`get({ field: value })`** — inherited from `BaseManager`, throws `NotFoundError` if not found. Use only when you expect the record to exist.
- **`create` / `update` / `delete`** — mutations. Return the bare affected entity.
- **`hasPermission` / `listForUser`** — required stubs for the permissioning framework. These names are fixed by the framework contract. Do not rename them.

There are no per-field eager read methods on the Manager. Single-field exact-match lookups are predicate helpers in `.where.ts` and are invoked through `filter({...})`.

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

- **GET routes → Manager directly.** Routes own reads. Call Manager methods and `attach*` inline — no service wrapper. Public list filters stay plural and explicit (`tradeCategories`, `zipCodes`); callers with one value still send a one-item list.
- **Mutation routes → Service → Manager.** Services own business logic for writes: orchestration, validation, error handling.

```typescript
// Route — GET detail, calls manager directly, attaches zip codes
router.get('/:id', permit(...), async (req, res, next) => {
  const contractor = await ContractorManager.get({ id: req.params.id });
  const [withZips] = await attachZipCodes([contractor]);
  res.json({ data: withZips });
});

// Route — GET list. Public filters are plural and domain-explicit.
router.get('/', async (req, res, next) => {
  const { search } = req.query as { search?: string };
  const result = await ContractorManager.filter({
    isGlobal: true,
    search,
    zipCodes: stringList(req.query.zipCodes),
    tradeCategories: tradeCategoryList(req.query.tradeCategories),
  });
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

```typescript
// BAD — singular value-bearing predicate; parallel plural variant will appear in a year
export function filterZipCode(zipCode?: string): SQL | undefined { /* ... */ }

// GOOD — plural from day one; single-value callers wrap in [zipCode]
export function filterZipCodes(zipCodes?: string[]): SQL | undefined { /* ... */ }
```
