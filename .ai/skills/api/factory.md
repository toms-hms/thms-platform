---
name: api-factory
description: Guide for writing test factories using fishery — one factory per model, transient params for required FK dependencies.
---

# API Test Factory

One factory file per model, colocated with the module under `factories/`. Factories insert into the real DB via the model's manager.

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
import { JobManager } from '@/job/models/JobManager';
import { TradeCategory, JobIntent } from '@thms/shared';
import type { Job } from '@/job/models/Job';

export const jobFactory = Factory.define<Job, { homeId: string; userId: string }>(
  ({ onCreate, transientParams, sequence }) => {
    onCreate((job) => JobManager.create(job));

    return {
      id:              createId(),
      homeId:          transientParams.homeId ?? '',
      createdByUserId: transientParams.userId ?? '',
      title:           `Test Job ${sequence}`,
      intent:          JobIntent.ISSUE,
      category:        TradeCategory.PLUMBING,
      description:     null,
      notes:           null,
      status:          'DRAFT',
      aiSession:       null,
      createdAt:       new Date(),
      updatedAt:       new Date(),
    };
  },
);
```

## Key points

- **`transientParams`** for required FK dependencies (homeId, userId). These are not stored on the model but the factory needs them to create valid records.
- **`onCreate`** wires the factory to persist to the DB. Return value is the persisted record.
- **`sequence`** produces a unique integer per call — use it for titles, emails, and any field that must be unique.
- **`createId()`** generates a fresh CUID2 for each factory call.

## Using the factory in tests

```typescript
// In a test file
const token = await loginAs('test-jobs@example.com');
const home = await createHome(user.id);

// Build without persisting (useful for asserting shape)
const jobShape = jobFactory.build({ title: 'My Job' }, { transient: { homeId: home.id, userId: user.id } });

// Build and persist to DB
const job = await jobFactory.create(
  { category: TradeCategory.ELECTRICAL },
  { transient: { homeId: home.id, userId: user.id } },
);
```

## Factory for a join-table model

When the model has two FK columns that are both required, pass both as transient params:

```typescript
// apps/api/src/job/factories/JobContractor.factory.ts
import { createId } from '@paralleldrive/cuid2';
import { Factory } from 'fishery';
import { JobContractorManager } from '@/job/models/JobContractorManager';
import { JobContractorStatus } from '@thms/shared';
import type { JobContractor } from '@/job/models/JobContractor';

export const jobContractorFactory = Factory.define<
  JobContractor,
  { jobId: string; contractorId: string }
>(({ onCreate, transientParams }) => {
  onCreate((jc) => JobContractorManager.create(jc));

  return {
    id:           createId(),
    jobId:        transientParams.jobId ?? '',
    contractorId: transientParams.contractorId ?? '',
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
