---
name: Manager Architecture — patterns and tradeoffs
description: Settled decisions on manager method design — QuerySet vs Manager, filter vs search distinction, filter/attach split, cross-module imports, JOIN vs separate queries, optional query pattern, in-memory filtering prohibition
type: project
---

## QuerySet vs Manager methods

Composable multi-field queries live on a `<Model>Query` class returned by `Manager.query()`. Each method is lazy, returns `this`, and is a no-op when its argument is undefined. Terminate with `.all()` or `.first()`.

Single-record exact-match lookups and mutations stay as eager methods on the manager (`get({...})`, `filterEmail`, `create`, `update`, `delete`).

```typescript
// QuerySet — chainable, one query
await ContractorManager.query()
  .filterZipCode(zipCode)
  .filterCategory(category)
  .search(text)
  .all();

// Manager — eager
await ContractorManager.get({ id });
await ContractorManager.filterEmail(email);
```

See `.ai/skills/manager.md` for the full convention.

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

The QuerySet distinguishes two kinds of predicates:

- **`filter<Field>`** — exact predicate against one column or relation (e.g. `filterZipCode`, `filterCategory`). One filter narrows the result set in a precise way.
- **`search`** — fuzzy text match across multiple columns using a single `OR` of `ILIKE` (e.g. name + companyName + email). Not a filter.

`search` is one query, never chained single-field text matches. The individual exact-match single-record lookups (e.g. `filterEmail`) live on the manager, not the QuerySet — they're terminal lookups, not building blocks for `search`.

## Optional query pattern — no-op if undefined

Every QuerySet method accepts an optional argument and is a no-op when undefined. Callers pass request query params unconditionally without null checks:

```typescript
// Route — no null check needed
const results = await ContractorManager.query()
  .filterZipCode(req.query.zipCode)
  .filterCategory(req.query.category)
  .search(req.query.search)
  .all();

// QuerySet method
filterZipCode(zipCode?: string): this {
  if (!zipCode) return this;
  // ...push condition
  return this;
}
```

## listForUser and hasPermission are framework stubs — names are fixed

These are required by the permissioning framework. `listForUser` is NOT a `filter*` method despite doing a DB query — its name is fixed by the framework contract. `filterUser` would be the equivalent non-framework method for querying by user.
