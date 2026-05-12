# Manager patterns

Managers are the data access layer. They own all DB queries for their module. Rules:

## Method naming

## Manager structure

Every manager is a class extending `BaseManager<TTable>` (from `src/utils/BaseManager.ts`), exported as a singleton:

```typescript
class ContractorManagerClass extends BaseManager<typeof contractors> {
  readonly table = contractors;
  // module-specific methods
}
export const ContractorManager = new ContractorManagerClass();
```

`BaseManager` provides a generic `get(where)` method — a typed single-record lookup from partial model fields:
```typescript
await ContractorManager.get({ id: '123' })
await ContractorManager.get({ email: 'joe@example.com' })
await ContractorManager.get({ id: '123', name: 'Smith' }) // AND conditions
```

## QuerySet vs Manager

**QuerySet methods** — lazy, chainable, live on the `<Model>Query` class. Return `this`. Execute with `.all()` or `.first()`:
```typescript
await ContractorManager.query()
  .filterZipCode(zipCode)   // lazy
  .filterCategory(category) // lazy
  .search(query)            // lazy
  .all();                   // executes — ONE query
```

**Manager methods** — eager single-record lookups and mutations, live on the manager class:
- `get({ field: value })` — inherited from BaseManager, throws NotFoundError if not found
- `filterEmail(email)` — eager single-record lookup
- `create / update / delete` — eager mutations
- `hasPermission / listForUser` — framework stubs, names fixed

## QuerySet filter and search methods

The QuerySet exposes two kinds of predicate methods:

**`filter<Field>`** — exact predicate against one column or relation. Lazy, no-op if argument is undefined, returns `this`:
- `filterZipCode(zip?)` — contractors serving this zip code
- `filterCategory(cat?)` — contractors whose categories include this value

**`search`** — fuzzy text match across multiple columns using a single `OR` of `ILIKE`. Lazy, no-op if argument is undefined, returns `this`. Not prefixed `filter*` because it isn't narrowing by an exact attribute — it's a multi-column fuzzy match:
- `search(query?)` — OR across name, company name, email

Single-field exact-match terminal lookups (like `filterEmail`) live on the manager, not the QuerySet — they're not building blocks for `search`. `search` is its own OR query; it does NOT call `filterEmail` + a `filterName` etc. separately (that would be N queries vs 1).

**Optional query pattern:** Every QuerySet method is a no-op when its argument is undefined. Routes pass request query params unconditionally without null checks:

```typescript
// Route — no null check needed
const results = await ContractorManager.query()
  .filterZipCode(req.query.zipCode)
  .filterCategory(req.query.category)
  .search(req.query.search)
  .all();

// QuerySet method
search(query?: string): this {
  if (!query) return this;
  const q = `%${query}%`;
  this.conditions.push(or(
    ilike(contractors.name, q),
    ilike(contractors.companyName, q),
    ilike(contractors.email, q),
  ) as SQL);
  return this;
}
```

**`attach<Object>`** — enriches an existing list with a related entity via one batched DB query.
- Takes an array of bare records, returns them with the relation populated
- Always one `WHERE id IN (...)` query — never query inside a loop
- Called by the route or service, never by a `filter*` method
- Example: `attachZipCodes(contractors)` — one query for all zip codes, distributed in memory

**`create`, `update`, `delete`** — standard mutations. Return the bare affected entity.

**`hasPermission`, `listForUser`** — required stubs for the permissioning framework. These names are fixed. Do not rename them.

## Core principles

- **`filter*` returns bare entities.** Never call `attach*` inside a `filter*` method. The caller decides what relations it needs and pays for them explicitly.
- **Always DB, never in-memory.** Filtering, sorting, and grouping belong in SQL. The only in-memory work allowed in a manager is distributing already-fetched results (e.g. grouping zip codes by contractor ID after a batched `IN` query).
- **No N+1 queries.** Never query inside a loop. Fetch related data for N records in one `WHERE id IN (...)` query.

## Data flow

- **GET routes → Manager directly.** Routes own reads. Call `filter*` and `attach*` inline — no service wrapper.
- **Mutation routes → Service → Manager.** Services own business logic for writes: orchestration, validation, error handling.

```typescript
// Route — GET detail, calls manager directly, attaches zip codes
router.get('/:id', permit(...), async (req, res, next) => {
  const contractor = await ContractorManager.filterById(req.params.id);
  if (!contractor) throw new NotFoundError('Contractor');
  const [withZips] = await attachZipCodes([contractor]);
  res.json({ data: withZips });
});

// Route — GET list, no zip codes needed, no service involved
router.get('/', async (req, res, next) => {
  const contractors = await PermissionService.list(ContractorManager, userId, role);
  res.json({ data: contractors });
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
// BAD — filter* calling attach* internally, every caller pays for zip codes
async filterById(id: string): Promise<ContractorWithRelations | undefined> {
  const [c] = await db.select()...
  const [result] = await attachZipCodes([c]); // hidden cost
  return result;
}

// GOOD — filter* returns bare entity, caller attaches when needed
async filterById(id: string): Promise<Contractor | undefined> {
  const [c] = await db.select().from(contractors).where(eq(contractors.id, id)).limit(1);
  return c ?? undefined;
}
```
