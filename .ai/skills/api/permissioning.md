---
name: api-permissioning
description: Guide for implementing permissions on a new resource — hasPermission, where.filterUser, permit middleware, and cache invalidation.
---

# Permissioning Pattern

Every resource follows two separate access paths:

- Single-object authorization uses `permit(...)` → `PermissionService.check(...)` → `manager.hasPermission(...)`.
- Collection visibility uses `PermissionService.list(...)` with `where.filterUser(userId)`.

Do not blur these together. A permission check must be an explicit boolean check for one resource. A list query applies a SQL visibility predicate for the collection.

## Required manager pieces

Names are fixed by the framework — do not rename them.

### `hasPermission(userId, resourceId): Promise<boolean>`
- Dedicated authorization check for one resource ID.
- Pure boolean data check — no role branching.
- Do not implement by calling `filterUser`, fetching a user-visible list, or scanning list results.
- Query the exact row needed for the check, or delegate to the owning parent resource.
- Only `true` results are cached by `PermissionService.check`; false always hits DB to avoid stale denials.
- Nested resources delegate up the ownership chain.

### `where.filterUser(userId): SQL | undefined`
- SQL visibility predicate for collection routes.
- Lives in `models/ModelNameManager.where.ts`.
- Encodes which rows may be returned to this user in lists.
- May use joins, subqueries, ownership columns, or membership tables.
- Must not be used for write/update/delete authorization.
- Must not replace `hasPermission` for single-object routes.

### `PermissionService.list(...)`
- Applies `where.filterUser(userId)` to list queries and warms the cache for returned rows.
- Must not loop over rows and call `hasPermission` per item.
- Admin/global list behavior should be explicit in the route or manager query; do not hide admin semantics inside `filterUser`.

## Ownership chain

```
ContractorManager   → always true (global resource)
HomeManager         → UserHome membership check
JobManager          → delegates to HomeManager via job.homeId
JobContractorManager → delegates to JobManager
QuoteManager        → delegates to JobManager
CommunicationManager → delegates to JobManager
```

## Implementing on a new manager

```typescript
// New resource owned by a Home
// DocumentManager.where.ts
import { and, eq, exists, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import { userHomes } from '@/home/models/UserHome';
import { documents } from './Document';

/** Matches documents readable by the given user through home membership. */
export function filterUser(userId: string): SQL {
  return exists(
    db.select({ id: userHomes.id })
      .from(userHomes)
      .where(and(
        eq(userHomes.userId, userId),
        eq(userHomes.homeId, documents.homeId),
      )),
  );
}

// New resource owned by a Home
class DocumentManagerClass extends BaseManager<typeof documents> {
  readonly table: typeof documents = documents;

  /** Delegates permission check up to the owning home. */
  async hasPermission(userId: string, documentId: string): Promise<boolean> {
    const doc = await this.findById(documentId);
    if (!doc) return false;
    return HomeManager.hasPermission(userId, doc.homeId);
  }

  /** Returns documents for a home using the caller-provided visibility predicate. */
  async listForHome(homeId: string, visibility: SQL) {
    return db.select().from(documents).where(and(
      eq(documents.homeId, homeId),
      visibility,
    ));
  }
}
```

## Wiring routes

### Collection routes — `PermissionService.list`

```typescript
import * as documentWhere from './models/DocumentManager.where';

router.get('/', async (req, res, next) => {
  try {
    const { userId } = getUser(req);
    const items = await PermissionService.list(
      DocumentManager,
      userId,
      documentWhere.filterUser(userId),
      (visibility) => DocumentManager.listForHome(homeId, visibility),
    );
    res.json({ data: items });
  } catch (err) { next(err); }
});
```

`PermissionService.list` applies `where.filterUser(userId)` through the list query and warms the cache for returned rows. It is collection visibility filtering, not single-object authorization.

### Single-object routes — `permit` middleware

```typescript
import { permit } from '../permissions/permit';

router.get('/:documentId',
  permit(DocumentManager, (req) => req.params.documentId),
  async (req, res, next) => {
    try {
      const doc = await DocumentManager.get({ id: req.params.documentId });
      res.json({ data: doc });
    } catch (err) { next(err); }
  },
);

// Same for PATCH and DELETE
router.patch('/:documentId',
  permit(DocumentManager, (req) => req.params.documentId),
  validate(UpdateDocumentSchema),
  handler,
);
```

`permit(...)` delegates to `manager.hasPermission(...)`. This is the authorization gate for `GET /:id`, `PATCH /:id`, `DELETE /:id`, and nested single-object actions.

### Admin-only actions

```typescript
import { requireRole } from '../middleware/auth.middleware';

router.post('/', requireRole('ADMIN'), validate(CreateSchema), handler);
```

## Cache invalidation on membership changes

Call from the service layer when ownership or membership changes:

```typescript
// User gains access to a resource
await PermissionService.set(userId, resourceId);

// User loses access or resource is deleted
await PermissionService.invalidate(userId, resourceId);
```

Common patterns:
```typescript
// createHome — creator gets access
await PermissionService.set(userId, home.id);

// addUserToHome — new member gets access
await PermissionService.set(targetUserId, homeId);

// removeUserFromHome — member loses access
await PermissionService.invalidate(targetUserId, homeId);

// deleteHome — all members lose access (call for each member)
await PermissionService.invalidate(userId, homeId);
```
