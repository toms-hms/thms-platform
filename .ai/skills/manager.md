# Manager patterns

Managers are the data access layer. They own all DB queries for their module. Rules:

## Method naming

**`filter*`** — DB query with a WHERE clause. Always returns bare entities — no relations attached.
- `filterById(id)` — WHERE id = ?, returns `T | undefined`
- `filterEmail(email)` — WHERE email ILIKE ?, returns `T | undefined`
- `filterAll()` — no WHERE, returns `T[]`
- `filterUser(userId)` — WHERE user_id = ?, returns `T[]`

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
