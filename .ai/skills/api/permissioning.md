---
name: api-permissioning
description: Guide for implementing permissions on a new resource — hasPermission, listForUser, permit middleware, and cache invalidation.
---

# Permissioning Pattern

Every resource follows two separate access paths:

- Single-object authorization uses `permit(...)` → `PermissionService.check(...)` → `manager.hasPermission(...)`.
- Collection visibility uses `PermissionService.list(...)` → `manager.listForUser(...)`.

Do not blur these together. A permission check must be an explicit boolean check for one resource. A list query is backend filtering for a collection.

## Two required methods on every manager

Names are fixed by the framework — do not rename them.

### `hasPermission(userId, resourceId): Promise<boolean>`
- Dedicated authorization check for one resource ID.
- Pure boolean data check — no role branching.
- Do not implement by calling `filterUser`, `listForUser`, or fetching a user-visible list and scanning it.
- Query the exact row needed for the check, or delegate to the owning parent resource.
- Only `true` results are cached by `PermissionService.check`; false always hits DB to avoid stale denials.
- Nested resources delegate up the ownership chain.

### `listForUser(userId, role, ...args): Promise<T[]>`
- Collection visibility query for list routes.
- Role-aware query strategy — the only place role matters.
- May call helper methods like `filterUser`, `filterAll`, or `queryForHome`.
- Must not loop over rows and call `hasPermission` per item.
- `ADMIN` → all records in the requested collection scope.
- `USER` → scoped query using joins, ownership filters, or parent membership checks.

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
class DocumentManagerClass extends BaseManager<typeof documents> {
  readonly table: typeof documents = documents;

  /** Delegates permission check up to the owning home. */
  async hasPermission(userId: string, documentId: string): Promise<boolean> {
    const doc = await this.findById(documentId);
    if (!doc) return false;
    return HomeManager.hasPermission(userId, doc.homeId);
  }

  /** Returns documents visible to the user in a collection route. */
  async listForUser(userId: string, role: UserRole, homeId: string) {
    return role === UserRole.ADMIN
      ? db.select().from(documents).where(eq(documents.homeId, homeId))
      : db.select().from(documents)
          .innerJoin(userHomes, eq(userHomes.homeId, documents.homeId))
          .where(and(eq(documents.homeId, homeId), eq(userHomes.userId, userId)));
  }
}
```

## Wiring routes

### Collection routes — `PermissionService.list`

```typescript
router.get('/', async (req, res, next) => {
  try {
    const { userId, role } = getUser(req);
    const items = await PermissionService.list(MyManager, userId, role, extraArg);
    res.json({ data: items });
  } catch (err) { next(err); }
});
```

`PermissionService.list` delegates to `manager.listForUser(...)` and warms the cache for returned rows. The manager is responsible for the scoped SQL query.

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
