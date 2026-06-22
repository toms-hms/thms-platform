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
2. `validate(ParamsSchema, 'params')` — validates path params before permit
3. Permission middleware (`permit(...)` or `requireRole(...)`)
4. `validate(QuerySchema, 'query')` or `validate(BodySchema)` — query or body validation
5. Manager call (reads) or service call (mutations)
6. `res.json({ data: result })` or `next(err)`

## Flat resource design

Every resource has one router mounted at its own path. Parent context is passed as data, not URL structure.

| Input | When to use |
|-------|-------------|
| `req.params` | Resource identity: `:jobId`, `:contractorId` — the thing being operated on |
| `req.query` | GET list filters: `?homeId=X&status=DRAFT` |
| `req.body` | Create/update payloads — includes parent IDs like `homeId` |

**No nested collection routers.** `GET /jobs?homeId=X` instead of `GET /homes/:homeId/jobs`. `POST /jobs` with `homeId` in body instead of `POST /homes/:homeId/jobs`. The hierarchy is in the data, not the URL.

**Exception — action sub-routes are fine.** When you already hold a permitted resource ID in params, sub-routes that operate on that specific resource are correct: `POST /jobs/:jobId/diagnose`, `POST /jobs/:jobId/contractors`, `GET /jobs/:jobId/images`. These are operations *on* a known resource, not collection queries that could be filtered differently.

## GET vs mutation routing

- **Reads → call managers directly**, even when assembling multiple relations with `Promise.all`.
- **Mutations → call a service function** when the write involves more than one step.
- **Parent permission on create** — when `homeId` (or another parent ID) comes from the body, check permission inline before calling the service.

## Standard pattern — jobs module

```typescript
// apps/api/src/job/route.ts (condensed)
import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { authenticateJWT } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validate.middleware';
import {
  JobParamsSchema, JobContractorParamsSchema, JobsQuerySchema,
  GetJobRequest, GetJobsRequest, CreateJobRequest,
  UpdateJobRequest, DeleteJobRequest,
  AssignContractorRequest, UpdateJobContractorRequest, DiagnoseRequest,
  CreateJobSchema, UpdateJobSchema, AssignContractorSchema,
  UpdateJobContractorSchema, DiagnoseSchema,
} from './schema';
import { JobManager } from './models/JobManager';
import { permit } from '@/permissions/permit';
import { PermissionService } from '@/permissions/PermissionService';
import { HomeManager } from '@/home/models/HomeManager';
import { ForbiddenError } from '@/utils/errors';
import * as jobService from './service';

export const jobRouter = Router();
jobRouter.use(authenticateJWT);

// List — homeId is an optional filter, not a required URL segment
jobRouter.get('/',
  validate(JobsQuerySchema, 'query'),
  async (req: GetJobsRequest, res: Response, next: NextFunction) => {
    try {
      const { userId, role } = req.user;
      const { homeId, ...filters } = req.query;
      if (homeId) {
        const allowed = await PermissionService.check(HomeManager, userId, homeId);
        if (!allowed) return next(new ForbiddenError());
      }
      const jobs = await PermissionService.list(JobManager, userId, role, homeId, filters);
      res.json({ data: jobs });
    } catch (err) { next(err); }
  },
);

// Create — homeId in body; permission check inline before service call
jobRouter.post('/',
  validate(CreateJobSchema),
  async (req: CreateJobRequest, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.user;
      const allowed = await PermissionService.check(HomeManager, userId, req.body.homeId);
      if (!allowed) return next(new ForbiddenError());
      const job = await jobService.createJob(req.body.homeId, userId, req.body);
      res.status(201).json({ data: job });
    } catch (err) { next(err); }
  },
);

// GET with relation assembly — call managers directly, no service wrapper
jobRouter.get('/:jobId',
  validate(JobParamsSchema, 'params'),
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
  validate(JobParamsSchema, 'params'),
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
  validate(JobParamsSchema, 'params'),
  permit(JobManager, (req) => req.params.jobId),
  async (req: DeleteJobRequest, res: Response, next: NextFunction) => {
    try {
      await jobService.deleteJob(req.params.jobId);
      res.json({ data: null });
    } catch (err) { next(err); }
  },
);

// Action sub-routes — operating on a specific permitted job
jobRouter.post('/:jobId/diagnose',
  validate(JobParamsSchema, 'params'),
  permit(JobManager, (req) => req.params.jobId),
  validate(DiagnoseSchema),
  async (req: DiagnoseRequest, res: Response, next: NextFunction) => {
    try {
      const result = await aiService.diagnoseJob(req.params.jobId, req.body.message);
      res.json({ data: result });
    } catch (err) { next(err); }
  },
);

jobRouter.post('/:jobId/contractors',
  validate(JobParamsSchema, 'params'),
  permit(JobManager, (req) => req.params.jobId),
  validate(AssignContractorSchema),
  async (req: AssignContractorRequest, res: Response, next: NextFunction) => {
    try {
      const jc = await jobService.assignContractor(req.params.jobId, req.body.contractorId, req.body.notes);
      res.status(201).json({ data: jc });
    } catch (err) { next(err); }
  },
);

jobRouter.patch('/:jobId/contractors/:jobContractorId',
  validate(JobContractorParamsSchema, 'params'),
  permit(JobManager, (req) => req.params.jobId),
  validate(UpdateJobContractorSchema),
  async (req: UpdateJobContractorRequest, res: Response, next: NextFunction) => {
    try {
      const jc = await jobService.updateJobContractor(req.params.jobContractorId, req.body);
      res.json({ data: jc });
    } catch (err) { next(err); }
  },
);
```

## app.ts — one mount per resource

```typescript
app.use('/api/v1/jobs', jobRouter);          // all job CRUD + sub-routes
app.use('/api/v1/homes', homeRouter);        // home CRUD only — no nested job router
app.use('/api/v1/contractors', contractorRouter);
app.use('/api/v1/quotes', quoteRouter);
app.use('/api/v1/communications', communicationRouter);
```

## Request type naming

- `Get...Request` — GET handlers
- `Create...Request` — POST that creates a resource
- `Update...Request` — PATCH handlers
- `Delete...Request` — DELETE handlers
- Action name — action sub-routes: `AssignContractorRequest`, `DiagnoseRequest`

Never use one broad type for multiple handlers. A PATCH has different params+body than a GET.

## List filter rules

- Validate query params with `validate(XsQuerySchema, 'query')`.
- Use plural names for every filter that can hold multiple values: `tradeCategories`, `zipCodes`.
- Do not support singular aliases.
- Use domain-explicit names: `tradeCategories` not `categories`.
- Pass `req.query` directly to the manager filter method.

## Admin-only routes

```typescript
import { requireRole } from '@/middleware/auth.middleware';

router.post('/', requireRole('ADMIN'), validate(CreateSchema), handler);
```

## Response shape

Always `{ data: result }` or let the error middleware handle `{ error: { code, message } }`. No other shape.
