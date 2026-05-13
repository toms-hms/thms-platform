---
name: api-permissioning
description: Guide for implementing permissions on a new resource — hasPermission, listForUser, permit middleware, and cache invalidation.
---

# Permissioning Pattern

Every resource follows a consistent two-method permission pattern on its manager, enforced via `PermissionService` and `permit` middleware.

## Two required methods on every manager

Names are fixed by the framework — do not rename them.

### `hasPermission(userId, resourceId): Promise<boolean>`
- Pure data check — no role branching
- Only caches `true` — false always hits DB to avoid stale denials
- Nested resources delegate up the ownership chain

### `listForUser(userId, role, ...args): Promise<T[]>`
- Role-aware query strategy — the only place role matters
- `ADMIN` → all records
- `USER` → scoped query (membership join or ownership check)

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
    const doc = await this.get({ id: documentId }).catch(() => null);
    if (!doc) return false;
    return HomeManager.hasPermission(userId, doc.homeId);
  }

  /** ADMIN returns all documents for the home; USER adds a membership join. */
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

### Lists — `PermissionService.list`

```typescript
router.get('/', async (req, res, next) => {
  try {
    const { userId, role } = getUser(req);
    const items = await PermissionService.list(MyManager, userId, role, extraArg);
    res.json({ data: items });
  } catch (err) { next(err); }
});
```

### Individual object access — `permit` middleware

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
