---
name: Manager Architecture — patterns and tradeoffs
description: Settled decisions on manager method design — predicate-helper composition, filter vs search distinction, attach pattern for relations, cross-module imports, JOIN vs separate queries, optional-arg pattern, in-memory filtering prohibition
type: project
---

## Composing multi-field queries — predicate helpers

A Manager method that filters by N optional fields is composed from N module-level predicate helper functions, each returning `SQL | undefined`. The Manager method assembles them with `and(...)` and runs the query once. This is Drizzle's recommended composition pattern — fully typed, no chain accumulator, no class boilerplate.

```typescript
// Predicate helpers at the top of ContractorManager.ts
function filterZipCode(zipCode?: string): SQL | undefined { /* ... */ }
function filterCategory(category?: TradeCategory): SQL | undefined { /* ... */ }
function search(query?: string): SQL | undefined { /* ... */ }

// Manager method composes them
async filter(opts: FilterOpts = {}): Promise<Contractor[]> {
  return db.select().from(contractors).where(and(
    filterZipCode(opts.zipCode),
    filterCategory(opts.category),
    search(opts.search),
  ));
}
```

**Why not a chainable QuerySet class:** A `<Model>Query` accumulator (Django/Rails style) requires `as SQL` casts, throws away Drizzle's per-step type narrowing, adds per-Manager boilerplate, and solves a problem TypeScript + Drizzle don't have. See `.ai/skills/manager.md` for the full rationale.

**File organization:** Predicate helpers live at the top of `<Name>Manager.ts` in a banner-commented section above the Manager class. When the helper set exceeds ~5 functions OR is consumed by a file other than the Manager, extract to a sibling `<Name>Manager.where.ts` and import as a namespace (`import * as ContractorWhere from './ContractorManager.where'`).

Single-record exact-match lookups and mutations stay as eager methods on the Manager (`get({...})` from BaseManager, `filterEmail`, `create`, `update`, `delete`) — they're not building blocks for composition.

## Core pattern: filter* returns bare, attach* enriches

`filter*` methods always return bare DB rows — no relations attached. Callers explicitly call `attach*` when they need relations. This makes the cost of each operation visible at the call site and avoids paying for data the caller never uses.

```typescript
// Route — only pays for zip codes when it needs them
const contractor = await ContractorManager.filterById(id);
const [withZips] = await attachZipCodes([contractor]); // explicit, not hidden
```

## In-memory filtering is never acceptable

All filtering belongs in SQL, not in `.filter()` / `.map()` calls on arrays returned from the DB. The only in-memory work allowed in a manager is distributing already-fetched results (e.g. grouping zip codes by contractor ID after a batched `IN` query).

**Why:** In-memory filtering fetches more rows than needed from the DB, and hides the cost from the caller.

## Cross-module table imports are acceptable when a JOIN provides a performance win

A manager method can import another module's Drizzle table schema to do a JOIN, when that JOIN reduces the number of DB round trips.

**Example:** `ContractorManager.filterJob` imports `jobs` and `homes` to JOIN them in a single query rather than calling `JobManager.filterById` + `HomeManager.filterById` separately (which would be 3 queries total vs 2).

**The rule:** Routes are the primary orchestration layer. But if a manager method genuinely benefits from a JOIN across module boundaries, the import is justified. The test is whether the JOIN reduces DB round trips for a legitimate single-concern operation.

## JOIN vs separate queries

Query count alone is not the deciding factor. The tradeoffs:

- **JOIN wins** when: single-row PK lookups on indexed foreign keys, one network round trip beats two, join cost is negligible (no large unfiltered sets, no cross-product risk)
- **Separate queries win** when: joining large unfiltered sets, the planner can't use indexes effectively, or the queries are in different services/processes

For `filterJob` specifically: joining `Job` and `Home` on indexed PKs with `LIMIT 1` is a O(1) index lookup on both sides — the JOIN cost is essentially free and one round trip beats two.

## filter vs search

Predicate helpers split into two kinds:

- **`filter<Field>`** — exact predicate against one column or relation (e.g. `filterZipCode`, `filterCategory`). Each `filter*` narrows the result set in a precise way.
- **`search`** — fuzzy text match across multiple columns using a single `OR` of `ILIKE` (e.g. name + companyName + email). Not prefixed `filter*` because it isn't narrowing by an exact attribute.

`search` is one query, never composed from single-field text matches. The individual exact-match single-record lookups (e.g. `filterEmail`) live on the Manager, not as predicate helpers — they're terminal lookups, not building blocks for `search`.

## Optional-arg pattern — `undefined` is a no-op

Every predicate helper accepts an optional argument and returns `undefined` when absent. `and(...)` skips `undefined` natively, so the Manager method passes request query params unconditionally without null checks:

```typescript
// Manager method
async filter(opts: FilterOpts = {}): Promise<Contractor[]> {
  return db.select().from(contractors).where(and(
    filterZipCode(opts.zipCode),
    filterCategory(opts.category),
    search(opts.search),
  ));
}

// Predicate helper
function filterZipCode(zipCode?: string): SQL | undefined {
  if (!zipCode) return undefined;
  // ...return inArray / eq / etc.
}
```

## listForUser and hasPermission are framework stubs — names are fixed

These are required by the permissioning framework. `listForUser` is NOT a `filter*` method despite doing a DB query — its name is fixed by the framework contract. `filterUser` would be the equivalent non-framework method for querying by user.
