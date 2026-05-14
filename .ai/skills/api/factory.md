---
name: api-factory
description: Guide for writing test factories using fishery — one factory per model, direct params for persisted columns, and parent rows only for omitted required FKs.
---

# API Test Factory

One factory file per model, colocated with the module under `factories/`. Factories insert into the real DB via the model's manager.

Each factory owns only its own row shape. A factory may create required parent rows to satisfy omitted foreign keys, but it must not create extra join rows or parent-side relationships that the model itself does not own.

## File location

```
src/{module}/factories/
  ModelName.factory.ts   — one per model
```

## Pattern — fishery `Factory.define`

```typescript
// apps/api/src/job/factories/Job.factory.ts
import { createId } from '@paralleldrive/cuid2';
import { Factory } from 'fishery';
import { userFactory } from '@/auth/factories/User.factory';
import { homeFactory } from '@/home/factories/Home.factory';
import { JobManager } from '@/job/models/JobManager';
import { TradeCategory, JobIntent, JobStatus } from '@thms/shared';
import type { Job } from '@/job/models/Job';

export const jobFactory = Factory.define<Job>(({ onCreate, params, sequence }) => {
  onCreate(async (job) => {
    const createdByUserId = params.createdByUserId ?? (await userFactory.create()).id;
    const homeId = params.homeId ?? (await homeFactory.create()).id;

    return JobManager.create({
      ...job,
      homeId,
      createdByUserId,
    });
  });

  return {
    id: createId(),
    homeId: params.homeId ?? createId(),
    createdByUserId: params.createdByUserId ?? createId(),
    title: params.title ?? `Test Job ${sequence}`,
    intent: params.intent ?? JobIntent.ISSUE,
    category: params.category ?? TradeCategory.PLUMBING,
    description: params.description ?? null,
    notes: params.notes ?? null,
    status: params.status ?? JobStatus.DRAFT,
    aiSession: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
});
```

## Key points

- **`params`** for persisted columns, including foreign keys (`homeId`, `createdByUserId`, `status`, etc.). Common calls should look like `jobFactory.create({ homeId })`.
- **`transientParams`** only for helper-only values that are not persisted on the model row.
- **Required FKs** may be satisfied by creating the missing parent row directly inside `onCreate`. Do not create unrelated relationship rows as a side effect.
- **`onCreate`** wires the factory to persist to the DB. Return value is the persisted record.
- **`sequence`** produces a unique integer per call — use it for titles, emails, and any field that must be unique.
- **`createId()`** generates a fresh CUID2 for each factory call.

## Using the factory in tests

```typescript
// In a test file
const token = await loginAs('test-jobs@example.com');
const home = await createHome(user.id);

// Build without persisting (useful for asserting shape)
const jobShape = jobFactory.build({ homeId: home.id, title: 'My Job' });

// Build and persist to DB
const job = await jobFactory.create({ homeId: home.id, category: TradeCategory.ELECTRICAL });
```

## Factory for a join-table model

When the model has two FK columns that are both required, accept both as normal params because they are persisted columns:

```typescript
// apps/api/src/job/factories/JobContractor.factory.ts
import { createId } from '@paralleldrive/cuid2';
import { Factory } from 'fishery';
import { JobContractorManager } from '@/job/models/JobContractorManager';
import { JobContractorStatus } from '@thms/shared';
import type { JobContractor } from '@/job/models/JobContractor';

export const jobContractorFactory = Factory.define<JobContractor>(({ onCreate, params }) => {
  onCreate((jc) => JobContractorManager.create(jc));

  return {
    id:           createId(),
    jobId:        params.jobId ?? createId(),
    contractorId: params.contractorId ?? createId(),
    status:       JobContractorStatus.NOT_CONTACTED,
    notes:        null,
    updatedAt:    new Date(),
  };
});
```

## What factories do NOT do

- No inline DB calls other than via the manager — factories don't import `db` directly.
- No cleanup — the test file owns cleanup (see `.ai/skills/api/testing.md`).
- No business logic — factories insert a record as-is; they don't fire service functions.
- No extra relationships — if a test needs a `UserHome`, create that row explicitly in the test.
