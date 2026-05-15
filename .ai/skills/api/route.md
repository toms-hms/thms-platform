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

## GET vs mutation routing

- **Reads → call managers directly**, even when assembling multiple relations with `Promise.all`.
- **Mutations → call a service function** when the write involves more than one step.

## Input source rules

| Input | When to use |
|-------|-------------|
| `req.params` | Resource identity: `:jobId`, `:homeId`, `:contractorId` |
| `req.query` | GET list filters: `?status=DRAFT&category=PLUMBING` |
| `req.body` | Create, update, and action payloads |

Validate each source separately with the matching schema. Params validation always comes first so the ID is known to be valid before the permission check runs.

## Standard GET + mutation pattern

```typescript
// apps/api/src/job/route.ts (condensed)
import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { authenticateJWT } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validate.middleware';
import {
  JobParamsSchema, HomeJobsParamsSchema, JobsQuerySchema,
  JobContractorParamsSchema,
  GetJobRequest, GetJobsRequest, GetHomeJobsRequest,
  CreateHomeJobRequest, UpdateJobRequest, DeleteJobRequest,
  AssignContractorRequest, UpdateJobContractorRequest,
  DiagnoseRequest, SuggestCategoriesRequest,
  CreateJobSchema, UpdateJobSchema,
  AssignContractorSchema, UpdateJobContractorSchema,
  DiagnoseSchema, SuggestTradeCategoriesSchema,
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
  validate(HomeJobsParamsSchema, 'params'),
  permit(HomeManager, (req) => req.params.homeId),
  validate(JobsQuerySchema, 'query'),
  async (req: GetHomeJobsRequest, res: Response, next: NextFunction) => {
    try {
      const { userId, role } = req.user;
      const jobs = await PermissionService.list(JobManager, userId, role, req.params.homeId, req.query);
      res.json({ data: jobs });
    } catch (err) { next(err); }
  },
);

// NOTE: category-suggestions is an AI sub-route — see apps/api/src/ai/route.ts,
// not homeJobRouter. AI-specific actions live in the AI module.

homeJobRouter.post('/',
  validate(HomeJobsParamsSchema, 'params'),
  permit(HomeManager, (req) => req.params.homeId),
  validate(CreateJobSchema),
  async (req: CreateHomeJobRequest, res: Response, next: NextFunction) => {
    try {
      const job = await jobService.createJob(req.params.homeId, req.user.userId, req.body);
      res.status(201).json({ data: job });
    } catch (err) { next(err); }
  },
);

// Mounted at /jobs
export const jobRouter = Router();
jobRouter.use(authenticateJWT);

jobRouter.get('/',
  validate(JobsQuerySchema, 'query'),
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

jobRouter.post('/:jobId/diagnose',
  validate(JobParamsSchema, 'params'),
  permit(JobManager, (req) => req.params.jobId),
  validate(DiagnoseSchema),
  async (req: DiagnoseRequest, res: Response, next: NextFunction) => {
    try {
      const result = await aiService.diagnoseJob({ jobId: req.params.jobId, message: req.body.message, userId: req.user.userId });
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

## Two-router pattern

Some modules export two routers — one scoped to a parent resource, one for the resource root. Both go into `app.ts`:

```typescript
// src/app.ts
app.use('/api/v1/homes/:homeId/jobs', homeJobRouter);
app.use('/api/v1/jobs', jobRouter);
```

The parent-scoped router uses `Router({ mergeParams: true })` so the parent `:id` param is accessible in handlers.

## Request type naming

Request types describe the HTTP operation:

- `Get...Request` — all GET handlers
- `Create...Request` — POST handlers that create a resource
- `Update...Request` — PATCH handlers
- `Delete...Request` — DELETE handlers
- Action name — action sub-routes: `AssignContractorRequest`, `DiagnoseRequest`, `SuggestCategoriesRequest`

Never use one broad type like `JobRequest` for multiple handlers. A PATCH handler has different params+body than a GET handler even on the same path.

## List filter rules

- Validate query params with `validate(XsQuerySchema, 'query')`.
- Use plural names for every filter that can hold multiple values: `tradeCategories`, `zipCodes`.
- Do not support singular aliases.
- Use domain-explicit names: `tradeCategories` not `categories`.
- Pass `req.query` directly to the manager filter method.

```typescript
// Good
router.get('/',
  validate(ContractorsQuerySchema, 'query'),
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
