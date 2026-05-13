---
name: api-route
description: Guide for writing Express route handlers — auth, permit, validate, and response shape.
---

# API Route

Routes translate HTTP input into manager calls or service calls and return `{ data }` or `{ error }`. No business logic lives here.

## File structure

```
src/{module}/route.ts   — Express Router only
```

Each handler follows this order:
1. Auth middleware (`authenticateJWT`)
2. Permission middleware (`permit(...)` or `requireRole(...)`)
3. Input validation (`validate(Schema)`)
4. Service or manager call
5. `res.json({ data: result })` or `next(err)`

## Auth user extraction

```typescript
function getUser(req: Parameters<typeof authenticateJWT>[0]) {
  return (req as unknown as AuthenticatedRequest).user;
}
```

Use this helper at the top of route files — the cast is required because Express's `Request` type doesn't know about JWT claims.

## Standard GET + mutation pattern

```typescript
// apps/api/src/job/route.ts (condensed)
import { Router } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { CreateJobSchema, UpdateJobSchema } from './schema';
import { JobManager } from './models/JobManager';
import { permit } from '../permissions/permit';
import { PermissionService } from '../permissions/PermissionService';
import { HomeManager } from '../home/models/HomeManager';
import * as jobService from './service';

function getUser(req: Parameters<typeof authenticateJWT>[0]) {
  return (req as unknown as AuthenticatedRequest).user;
}

// Mounted at /homes/:homeId/jobs — mergeParams: true so :homeId is visible
export const jobCollectionRouter = Router({ mergeParams: true });
jobCollectionRouter.use(authenticateJWT);

// List — role-aware via PermissionService.list
jobCollectionRouter.get('/',
  permit(HomeManager, (req) => (req.params as any).homeId),
  async (req, res, next) => {
    try {
      const { userId, role } = getUser(req);
      const jobs = await PermissionService.list(
        JobManager, userId, role,
        (req.params as any).homeId,
        { status: req.query.status as string, category: req.query.category as string },
      );
      res.json({ data: jobs });
    } catch (err) { next(err); }
  },
);

// Create — validate body, call service, 201
jobCollectionRouter.post('/',
  permit(HomeManager, (req) => (req.params as any).homeId),
  validate(CreateJobSchema),
  async (req, res, next) => {
    try {
      const { userId } = getUser(req);
      const job = await jobService.createJob((req.params as any).homeId, userId, req.body);
      res.status(201).json({ data: job });
    } catch (err) { next(err); }
  },
);

// Individual object router — mounted at /jobs
export const jobRouter = Router();
jobRouter.use(authenticateJWT);

jobRouter.get('/:jobId',
  permit(JobManager, (req) => req.params.jobId),
  async (req, res, next) => {
    try {
      const job = await jobService.getJob(req.params.jobId);
      res.json({ data: job });
    } catch (err) { next(err); }
  },
);

jobRouter.patch('/:jobId',
  permit(JobManager, (req) => req.params.jobId),
  validate(UpdateJobSchema),
  async (req, res, next) => {
    try {
      const job = await jobService.updateJob(req.params.jobId, req.body);
      res.json({ data: job });
    } catch (err) { next(err); }
  },
);

jobRouter.delete('/:jobId',
  permit(JobManager, (req) => req.params.jobId),
  async (req, res, next) => {
    try {
      await jobService.deleteJob(req.params.jobId);
      res.json({ data: null });
    } catch (err) { next(err); }
  },
);
```

## Two-router pattern

Some modules export two routers — one scoped to a parent collection, one for individual objects mounted at the resource root. Both go into `app.ts`:

```typescript
// src/app.ts
app.use('/api/v1/homes/:homeId/jobs', jobCollectionRouter);
app.use('/api/v1/jobs', jobRouter);
```

## List filter rules

- Accept explicit query filters from the caller.
- Pass filters directly to a manager method so filtering stays in SQL.
- Use plural query names for every list filter that can hold multiple values.
- Do not support singular aliases.
- Use domain-explicit names: `tradeCategories`, not `categories`.

```typescript
// Good: explicit plural filters passed through
router.get('/', async (req, res, next) => {
  const result = await ContractorManager.filter({
    isGlobal: true,
    search: req.query.search as string,
    zipCodes: stringList(req.query.zipCodes),
    tradeCategories: tradeCategoryList(req.query.tradeCategories),
  });
  res.json({ data: result });
});

// Bad: convenience param that hides a cross-resource lookup
router.get('/', async (req, res, next) => {
  const job = await JobManager.findById(req.query.jobId); // hidden lookup
  const contractors = await ContractorManager.filter({ tradeCategories: [job.category] });
});
```

## Admin-only routes

```typescript
import { requireRole } from '../middleware/auth.middleware';

router.post('/', requireRole('ADMIN'), validate(CreateSchema), handler);
```

## Response shape

Always `{ data: result }` or let the error middleware handle `{ error: { code, message } }`. No other shape.
