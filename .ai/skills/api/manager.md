---
name: api-manager
description: Guide for writing Manager classes — the DB query layer. Use when adding filter predicates, attach helpers, or CRUD methods.
---

# API Manager

Managers own all DB queries for their module. Routes call managers directly for reads; services call managers for writes.

## Class structure

Every manager extends `BaseManager<TTable>`, exported as a singleton. **Always annotate `readonly table` explicitly** — without it TS infers an internal Drizzle type that breaks `declaration: true` builds.

```typescript
class ContractorManagerClass extends BaseManager<typeof contractors> {
  readonly table: typeof contractors = contractors;
  // ...
}
export const ContractorManager = new ContractorManagerClass();
```

`BaseManager` provides `get(where)` — typed single-record lookup that throws `NotFoundError` on miss:

```typescript
await ContractorManager.get({ id: '123' })
await ContractorManager.get({ id: '123', name: 'Smith' }) // AND conditions
```

Use `get` only when the record is expected to exist (e.g. after `permit()` middleware). For existence checks, use `filter({...})` — returns `[]` on miss.

## Predicate helpers — `.where.ts` sibling file

Multi-field filters are composed from predicate helper functions, each returning `SQL | undefined`. They always live in `<Name>Manager.where.ts`, imported with `import * as where from './<Name>Manager.where'`.

Every permissioned resource also defines `filterUser(userId)` in its `.where.ts` file. That predicate is the collection visibility filter used by `PermissionService.list`; it is not used for single-object authorization.

### Naming rules

- **Plural, array-valued** for every value-bearing predicate. Single-value callers wrap in `[value]`.
- **Domain-explicit** names: `filterTradeCategories`, not `filterCategories`.
- **Boolean predicates** (`filterIsGlobal(isGlobal?: boolean)`) are exempt from the plural rule.
- **`filterUser(userId)`** is the reserved collection visibility predicate for permissioned list routes.
- **`search`** is not prefixed `filter*` — it's a fuzzy OR across multiple columns.

### Empty array vs undefined

- `undefined` → no-op (predicate is absent)
- `[]` → match nothing → `sql\`1 = 0\``

```typescript
// apps/api/src/contractor/models/ContractorManager.where.ts
import { arrayOverlaps, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import { TradeCategory } from '@thms/shared';
import { contractors } from './Contractor';
import { contractorZipCodes } from './ContractorZipCode';

/** Matches contractors by primary key list. Empty array matches nothing. */
export function filterIds(ids?: string[]): SQL | undefined {
  if (ids === undefined) return undefined;
  if (ids.length === 0) return sql`1 = 0`;
  return inArray(contractors.id, ids);
}

/** Matches contractors that serve any of the given zip codes (subquery on join table). */
export function filterZipCodes(zipCodes?: string[]): SQL | undefined {
  if (zipCodes === undefined) return undefined;
  if (zipCodes.length === 0) return sql`1 = 0`;
  const subq = db
    .select({ contractorId: contractorZipCodes.contractorId })
    .from(contractorZipCodes)
    .where(inArray(contractorZipCodes.zipCode, zipCodes));
  return inArray(contractors.id, subq);
}

/** Matches contractors whose category array overlaps the given list. */
export function filterTradeCategories(tradeCategories?: TradeCategory[]): SQL | undefined {
  if (tradeCategories === undefined) return undefined;
  if (tradeCategories.length === 0) return sql`1 = 0`;
  return arrayOverlaps(contractors.categories, tradeCategories);
}

/** Matches contractors by email (case-insensitive OR). */
export function filterEmails(emails?: string[]): SQL | undefined {
  if (emails === undefined) return undefined;
  if (emails.length === 0) return sql`1 = 0`;
  return or(...emails.map((e) => ilike(contractors.email, e)));
}

/** Matches by isGlobal flag; undefined = no-op. */
export function filterIsGlobal(isGlobal?: boolean): SQL | undefined {
  return isGlobal === undefined ? undefined : eq(contractors.isGlobal, isGlobal);
}

/** Fuzzy text search across name, companyName, and email columns. */
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

  /** Returns contractors matching any combination of optional filters in a single query. */
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

## `attach*` helpers for relations

Fetches a related entity for N records in one batched query, then distributes in memory. Never query inside a loop.

```typescript
/** Fetches zip codes for the given contractors in one batched query and attaches them. */
export async function attachZipCodes(rows: Contractor[]): Promise<ContractorWithRelations[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((c) => c.id);
  const zips = await db.select().from(contractorZipCodes).where(inArray(contractorZipCodes.contractorId, ids));
  return rows.map((c) => ({
    ...c,
    zipCodes: zips.filter((z) => z.contractorId === c.id).map((z) => z.zipCode),
  }));
}
```

- Called by routes or services, never inside a predicate helper or read method.
- Read methods return bare entities — the caller pays for relations it needs.

## Mutations with transactions

```typescript
/** Creates a contractor with the given zip codes in a single transaction. Returns bare contractor. */
async create(data: NewContractor, zipCodes: string[]): Promise<Contractor> {
  return db.transaction(async (tx) => {
    const [c] = await tx.insert(contractors).values(data).returning();
    if (zipCodes.length > 0) {
      await tx.insert(contractorZipCodes)
        .values(zipCodes.map((z) => ({ id: createId(), contractorId: c.id, zipCode: z })));
    }
    return c;
  });
}

/** Updates contractor fields and optionally replaces zip codes atomically. */
async update(id: string, data: Partial<NewContractor>, zipCodes?: string[]): Promise<Contractor> {
  return db.transaction(async (tx) => {
    const [c] = await tx
      .update(contractors)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(contractors.id, id))
      .returning();
    if (!c) throw new NotFoundError('Contractor');
    if (zipCodes !== undefined) {
      await tx.delete(contractorZipCodes).where(eq(contractorZipCodes.contractorId, id));
      if (zipCodes.length > 0) {
        await tx.insert(contractorZipCodes)
          .values(zipCodes.map((z) => ({ id: createId(), contractorId: id, zipCode: z })));
      }
    }
    return c;
  });
}
```

## Required permissioning stubs

Every manager must implement `hasPermission` for single-object authorization, and its `.where.ts` file must export `filterUser` for collection visibility. Do not implement `hasPermission` by calling `filterUser`.

```typescript
// ContractorManager.ts
/** Always returns true — global contractors are visible to all users. */
async hasPermission(_userId: string, _resourceId: string): Promise<boolean> {
  return true;
}

// ContractorManager.where.ts
/** Matches contractors visible in user-facing collection routes. */
export function filterUser(_userId: string): SQL | undefined {
  return eq(contractors.isGlobal, true);
}
```

See `.ai/skills/api/permissioning.md` for the full ownership-chain pattern.

## Core rules

- Read methods return bare entities. Never call `attach*` inside a read method.
- Always DB, never in-memory. Filtering and sorting belong in SQL.
- No N+1 queries. Use `WHERE id IN (...)` for related data across N records.
- GET routes call managers directly. Mutation routes go through services.
