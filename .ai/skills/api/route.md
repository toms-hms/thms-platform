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
3. Input validation (`validate(Schema)` or `validate(Schema, 'query')`)
4. Service or manager call
5. `res.json({ data: result })` or `next(err)`

## Standard GET + mutation pattern

```typescript
// apps/api/src/job/route.ts (condensed)
import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { authenticateJWT } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validate.middleware';
import {
  HomeJobsRequest, HomeJobsSchema,
  JobRequest, JobSchema,
  JobsRequest, JobsSchema,
  CreateJobSchema, UpdateJobSchema,
} from './schema';
import { JobManager } from './models/JobManager';
import { permit } from '@/permissions/permit';
import { PermissionService } from '@/permissions/PermissionService';
import { HomeManager } from '@/home/models/HomeManager';
import * as jobService from './service';

// Mounted at /homes/:homeId/jobs — mergeParams: true so :homeId is visible
export const homeJobRouter = Router({ mergeParams: true });
homeJobRouter.use(authenticateJWT);

homeJobRouter.get('/',
  permit(HomeManager, (req) => req.params.homeId),
  validate(JobsSchema, 'query'),
  async (req: HomeJobsRequest, res: Response, next: NextFunction) => {
    try {
      const { userId, role } = req.user;
      const jobs = await PermissionService.list(JobManager, userId, role, req.params.homeId, req.query);
      res.json({ data: jobs });
    } catch (err) { next(err); }
  },
);

homeJobRouter.post('/',
  permit(HomeManager, (req) => req.params.homeId),
  validate(CreateJobSchema),
  async (req: HomeJobsRequest, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.user;
      const job = await jobService.createJob(req.params.homeId, userId, req.body);
      res.status(201).json({ data: job });
    } catch (err) { next(err); }
  },
);

// Mounted at /jobs
export const jobRouter = Router();
jobRouter.use(authenticateJWT);

jobRouter.get('/',
  validate(JobsSchema, 'query'),
  async (req: JobsRequest, res: Response, next: NextFunction) => {
    try {
      const { userId, role } = req.user;
      const jobs = await PermissionService.list(JobManager, userId, role, req.query);
      res.json({ data: jobs });
    } catch (err) { next(err); }
  },
);

jobRouter.get('/:jobId',
  permit(JobManager, (req) => req.params.jobId),
  async (req: JobRequest, res: Response, next: NextFunction) => {
    try {
      const job = await jobService.getJob(req.params.jobId);
      res.json({ data: job });
    } catch (err) { next(err); }
  },
);

jobRouter.patch('/:jobId',
  permit(JobManager, (req) => req.params.jobId),
  validate(UpdateJobSchema),
  async (req: JobRequest, res: Response, next: NextFunction) => {
    try {
      const job = await jobService.updateJob(req.params.jobId, req.body);
      res.json({ data: job });
    } catch (err) { next(err); }
  },
);

jobRouter.delete('/:jobId',
  permit(JobManager, (req) => req.params.jobId),
  async (req: JobRequest, res: Response, next: NextFunction) => {
    try {
      await jobService.deleteJob(req.params.jobId);
      res.json({ data: null });
    } catch (err) { next(err); }
  },
);
```

## Two-router pattern

Some modules export two routers — one scoped to a parent resource, one for the resource root. Both go into `app.ts`:

```typescript
// src/app.ts
app.use('/api/v1/homes/:homeId/jobs', homeJobRouter);
app.use('/api/v1/jobs', jobRouter);
```

The parent-scoped router uses `Router({ mergeParams: true })` so the parent `:id` param is accessible in handlers.

## List filter rules

- Accept explicit query filters from the caller.
- Pass filters directly to a manager method so filtering stays in SQL.
- Use plural query names for every list filter that can hold multiple values.
- Do not support singular aliases.
- Use domain-explicit names: `tradeCategories`, not `categories`.
- Validate query params with `validate(Schema, 'query')` — the handler's `TypedRequest` type gives you the typed `req.query`.

```typescript
// Good
router.get('/',
  validate(ContractorsSchema, 'query'),
  async (req: ContractorsRequest, res: Response, next: NextFunction) => {
    const result = await ContractorManager.filter(req.query);
    res.json({ data: result });
  },
);

// Bad: convenience param that hides a cross-resource lookup
router.get('/', async (req, res, next) => {
  const job = await JobManager.findById(req.query.jobId);
  const contractors = await ContractorManager.filter({ tradeCategories: [job.category] });
});
```

## Admin-only routes

```typescript
import { requireRole } from '@/middleware/auth.middleware';

router.post('/', requireRole('ADMIN'), validate(CreateSchema), handler);
```

## Response shape

Always `{ data: result }` or let the error middleware handle `{ error: { code, message } }`. No other shape.
