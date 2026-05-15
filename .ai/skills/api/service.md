---
name: api-service
description: Guide for writing service layer functions — orchestration, business logic, and when NOT to use a service.
---

# API Service

Services own business logic for mutations: orchestration, multi-step operations, and error handling. They have no Express types — inputs are plain values, outputs are entities or throw.

## When to use a service vs calling the manager directly

- **GET routes → managers directly from the route handler. Always.** No service wrapper needed for reads, even when assembling relations.
- **Mutation routes → service → manager.** Use a service when the write involves more than one step, cache warming, or non-trivial business rules.

## File

```
src/{module}/service.ts   — named async function exports only. No req/res. No Express imports.
```

## Import pattern

Service modules export named functions. Always import with `* as`:

```typescript
import * as homeService from '@/home/service';
import * as jobService from './service';

// Call as:
homeService.createHome(userId, data);
jobService.updateJob(jobId, data);
```

Never import service functions individually (`import { createHome }`) — the namespace import makes the module boundary explicit at call sites.

## Function naming

`createX`, `updateX`, `deleteX`. Throw from `@/utils/errors` — never return error objects.

## Realistic example — createJob

```typescript
// apps/api/src/job/service.ts (condensed)
import { createId } from '@paralleldrive/cuid2';
import { JobManager } from './models/JobManager';
import { JobContractorManager } from './models/JobContractorManager';
import { JobContractorStatus, JobIntent } from '@thms/shared';
import type { CreateJobData, UpdateJobData } from './schema';

export async function createJob(
  homeId: string,
  userId: string,
  data: CreateJobData,
): Promise<Job> {
  return JobManager.create({
    id: createId(),
    homeId,
    createdByUserId: userId,
    title: data.title,
    intent: data.intent ?? JobIntent.ISSUE,
    category: data.category,
    description: data.description ?? null,
    notes: data.notes ?? null,
    status: data.status ?? 'DRAFT',
    aiSession: {
      messages: [],
      summary: null,
      categorySuggestions: [],
    },
    updatedAt: new Date(),
  });
}

export async function updateJob(jobId: string, data: UpdateJobData): Promise<Job> {
  return JobManager.update(jobId, { ...data, updatedAt: new Date() });
}

export async function assignContractor(jobId: string, contractorId: string, notes?: string): Promise<JobContractor> {
  return JobContractorManager.create({
    id: createId(),
    jobId,
    contractorId,
    status: JobContractorStatus.NOT_CONTACTED,
    notes: notes ?? null,
    updatedAt: new Date(),
  });
}
```

## What does NOT belong in a service

- Read / GET logic — always call managers directly from the route, even when assembling relations via `Promise.all`
- Express `req`, `res`, `next` — service functions are pure TypeScript
- HTTP status codes — belong in the route
- Direct DB queries — call a manager method instead
