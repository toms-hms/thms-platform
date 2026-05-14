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
4. Manager call (reads) or service call (mutations)
5. `res.json({ data: result })` or `next(err)`

## GET vs mutation routing

- **Reads → call managers directly**, even when assembling multiple relations with `Promise.all`.
- **Mutations → call a service function** when the write involves more than one step.

## Standard GET + mutation pattern

```typescript
// apps/api/src/job/route.ts (condensed)
import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { authenticateJWT } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validate.middleware';
import {
  HomeJobsSchema, JobSchema, JobsSchema,
  GetHomeJobsRequest, GetJobsRequest, GetJobRequest,
  CreateHomeJobRequest, UpdateJobRequest, DeleteJobRequest,
  CreateJobSchema, UpdateJobSchema,
} from './schema';
import { JobManager } from './models/JobManager';
import { JobContractorManager } from './models/JobContractorManager';
import { JobImageManager } from './models/JobImageManager';
import { QuoteManager } from '@/quote/models/QuoteManager';
import { CommunicationManager } from '@/communication/models/CommunicationManager';
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
  async (req: GetHomeJobsRequest, res: Response, next: NextFunction) => {
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
  async (req: CreateHomeJobRequest, res: Response, next: NextFunction) => {
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
  async (req: GetJobsRequest, res: Response, next: NextFunction) => {
    try {
      const { userId, role } = req.user;
      const jobs = await PermissionService.list(JobManager, userId, role, req.query);
      res.json({ data: jobs });
    } catch (err) { next(err); }
  },
);

// GET with relation assembly — call managers directly, no service wrapper
jobRouter.get('/:jobId',
  permit(JobManager, (req) => req.params.jobId),
  async (req: GetJobRequest, res: Response, next: NextFunction) => {
    try {
      const { jobId } = req.params;
      const [job, contractors, images, quotes, communications] = await Promise.all([
        JobManager.get({ id: jobId }),
        JobContractorManager.filter({ jobIds: [jobId] }),
        JobImageManager.filter({ jobIds: [jobId] }),
        QuoteManager.filter({ jobIds: [jobId] }),
        CommunicationManager.filter({ jobIds: [jobId] }),
      ]);
      res.json({ data: { ...job, contractors, images, quotes, communications } });
    } catch (err) { next(err); }
  },
);

jobRouter.patch('/:jobId',
  permit(JobManager, (req) => req.params.jobId),
  validate(UpdateJobSchema),
  async (req: UpdateJobRequest, res: Response, next: NextFunction) => {
    try {
      const job = await jobService.updateJob(req.params.jobId, req.body);
      res.json({ data: job });
    } catch (err) { next(err); }
  },
);

jobRouter.delete('/:jobId',
  permit(JobManager, (req) => req.params.jobId),
  async (req: DeleteJobRequest, res: Response, next: NextFunction) => {
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

## Request Type Names

Request type names describe the HTTP route contract:

- GET handlers always use `Get...Request`: `GetJobRequest`, `GetJobsRequest`, `GetHomeJobsRequest`.
- Create handlers use `Create...Request`: `CreateHomeJobRequest` for `POST /homes/:homeId/jobs`.
- Update handlers use `Update...Request`: `UpdateJobRequest` for `PATCH /jobs/:jobId`.
- Delete handlers use `Delete...Request`: `DeleteJobRequest` for `DELETE /jobs/:jobId`.
- Action handlers use the action name: `AssignContractorRequest`, `StartDiagnoseRequest`, `SendEmailRequest`.

Map HTTP input sources consistently:

| Input source | Use for |
|--------------|---------|
| `req.params` | Path identity, e.g. `:jobId`, `:homeId` |
| `req.query` | GET list filters |
| `req.body` | Create, update, and action payloads |

Do not use one broad type like `JobRequest` or `ContractorsRequest` for every handler in a module. A route with params and body gets a request type composed from both schemas.

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
  async (req: GetContractorsRequest, res: Response, next: NextFunction) => {
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
