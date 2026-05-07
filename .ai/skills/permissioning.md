---
name: permissioning
description: Guide for implementing permissions on a new resource. Use when adding a new manager, wiring up routes, or debugging permission issues.
---

# Permissioning Pattern

Every resource in this codebase follows a consistent two-method permission pattern on its manager, enforced via `PermissionService` and `permit` middleware.

## Two methods on every manager

### `hasPermission(userId, resourceId): Promise<boolean>`
- Pure data check — no role branching
- Only caches `true` — false always hits DB to avoid stale denials
- Nested resources delegate up the ownership chain

### `listForUser(userId, role, ...args): Promise<T[]>`
- Role-aware query strategy — the only place role matters
- `ADMIN` → `findAll()`
- `USER` → scoped query (membership join)

## Ownership chain

```
ContractorManager   hasPermission → always true (global)
HomeManager         hasPermission → UserHome membership check
JobManager          hasPermission → delegates to HomeManager via job.homeId
JobContractorManager → delegates to JobManager
QuoteManager        → delegates to JobManager
CommunicationManager → delegates to JobManager
```

## Implementing on a new manager

```ts
// 1. hasPermission — pure data, no role
async hasPermission(userId: string, resourceId: string): Promise<boolean> {
  // For top-level resource: check direct ownership/membership
  const record = await db.select()
    .from(myTable)
    .where(and(eq(myTable.id, resourceId), eq(myTable.userId, userId)))
    .limit(1);
  return !!record[0];

  // For nested resource: delegate to parent
  const record = await this.findById(resourceId);
  if (!record) return false;
  return ParentManager.hasPermission(userId, record.parentId);
}

// 2. listForUser — role-aware query
async listForUser(userId: string, role: UserRole, ...args: any[]) {
  return role === 'ADMIN'
    ? this.findAll(...args)
    : this.findForUser(userId, ...args); // scoped query
}
```

## Wiring routes

### Lists — call PermissionService.list
```ts
router.get('/', async (req, res, next) => {
  try {
    const { userId, role } = (req as AuthenticatedRequest).user;
    const items = await PermissionService.list(MyManager, userId, role);
    res.json({ data: items });
  } catch (err) { next(err); }
});
```

### Individual object access — use permit middleware
```ts
import { permit } from '../permissions/permit';

router.get('/:resourceId',
  permit(MyManager, (req) => req.params.resourceId),
  async (req, res, next) => {
    try {
      const item = await MyManager.findById(req.params.resourceId);
      res.json({ data: item });
    } catch (err) { next(err); }
  }
);

// Same for PATCH and DELETE
router.patch('/:resourceId',
  permit(MyManager, (req) => req.params.resourceId),
  handler
);
```

### Admin-only actions — requireRole (separate from permit)
```ts
import { requireRole } from '../middleware/auth.middleware';

router.post('/', requireRole('ADMIN'), validate(Schema), handler);
```

## Cache invalidation on mutations

Call these from the service layer when membership/ownership changes:

```ts
// When user gains access
PermissionService.set(userId, resourceId);

// When user loses access or resource is deleted
PermissionService.invalidate(userId, resourceId);
```

Common patterns:
```ts
// createHome — creator gets access
await PermissionService.set(userId, home.id);

// addUserToHome — new member gets access
await PermissionService.set(targetUserId, homeId);

// removeUserFromHome — member loses access
await PermissionService.invalidate(targetUserId, homeId);

// deleteHome — creator loses access
await PermissionService.invalidate(userId, homeId);
```

## Worked example — adding a new `Document` resource owned by a Home

**1. `DocumentManager.ts`**
```ts
async hasPermission(userId: string, documentId: string): Promise<boolean> {
  const doc = await this.findById(documentId);
  if (!doc) return false;
  return HomeManager.hasPermission(userId, doc.homeId);
}

async listForUser(userId: string, role: UserRole, homeId: string) {
  return role === 'ADMIN'
    ? db.select().from(documents).where(eq(documents.homeId, homeId))
    : db.select().from(documents)
        .innerJoin(userHomes, eq(userHomes.homeId, documents.homeId))
        .where(and(eq(documents.homeId, homeId), eq(userHomes.userId, userId)));
}
```

**2. `document/route.ts`**
```ts
router.get('/',
  async (req, res, next) => {
    const { userId, role } = (req as AuthenticatedRequest).user;
    const docs = await PermissionService.list(DocumentManager, userId, role, req.params.homeId);
    res.json({ data: docs });
  }
);

router.get('/:documentId',
  permit(DocumentManager, (req) => req.params.documentId),
  async (req, res, next) => {
    const doc = await DocumentManager.findById(req.params.documentId);
    res.json({ data: doc });
  }
);
```
