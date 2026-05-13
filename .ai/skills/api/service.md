---
name: api-service
description: Guide for writing service layer functions — orchestration, business logic, and when NOT to use a service.
---

# API Service

Services own business logic for writes: orchestration, multi-step operations, and error handling. They have no Express types — inputs are plain values, outputs are entities or throw.

## When to use a service vs calling the manager directly

- **GET routes → manager directly.** No service wrapper needed for reads.
- **Mutation routes → service → manager.** Use a service when the write involves more than one DB call, cache warming, or non-trivial business rules.

## File

```
src/{module}/service.ts   — async functions only. No req/res. No Express imports.
```

## Function naming

`createX`, `getX`, `listX`, `updateX`, `deleteX`. Throw from `@/utils/errors` — never return error objects.

## Realistic example — createJob with category suggestions

The job service wraps creation in business logic: it generates trade-category suggestions, initializes the AI session, and handles a multi-contractor assignment list. None of this belongs in a route handler.

```typescript
// apps/api/src/job/service.ts (condensed)
import { createId } from '@paralleldrive/cuid2';
import { NotFoundError } from '../utils/errors';
import { JobManager } from './models/JobManager';
import { JobContractorManager } from './models/JobContractorManager';
import type { CreateJobInput } from '@thms/shared';
import { JobIntent, TradeCategory } from '@thms/shared';

const CATEGORY_RULES: Array<{ category: TradeCategory; terms: string[]; reason: string }> = [
  { category: TradeCategory.PLUMBING, terms: ['bathroom', 'toilet', 'shower', 'pipe', 'drain', 'water', 'leak'], reason: 'Mentions water, drains, fixtures, or bathroom work.' },
  { category: TradeCategory.ELECTRICAL, terms: ['outlet', 'switch', 'breaker', 'wire', 'light', 'electrical', 'power'], reason: 'Mentions power, wiring, lighting, or panel work.' },
  // ... one entry per TradeCategory
];

/** Returns trade-category suggestions based on term matching in title + description. */
export function suggestTradeCategories(data: {
  intent: JobIntent;
  title: string;
  description?: string;
  selectedCategories?: TradeCategory[];
}): TradeCategorySuggestion[] {
  const text = `${data.title} ${data.description ?? ''}`.toLowerCase();
  const matches: TradeCategorySuggestion[] = [];
  for (const rule of CATEGORY_RULES) {
    if (rule.terms.some((t) => text.includes(t))) {
      matches.push({ category: rule.category, reason: rule.reason });
    }
  }
  return matches;
}

/** Creates a job, seeding it with category suggestions and an empty AI session. */
export async function createJob(
  homeId: string,
  userId: string,
  data: CreateJobData,
): Promise<Job> {
  const suggestions = suggestTradeCategories({
    intent: data.intent ?? JobIntent.ISSUE,
    title: data.title,
    description: data.description,
  });

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
    aiSession: data.aiSession ?? {
      messages: [],
      summary: null,
      categorySuggestions: suggestions,
    },
    updatedAt: new Date(),
  });
}

/** Returns a job with all relations — contractors, images, quotes, communications. */
export async function getJob(jobId: string): Promise<JobWithRelations> {
  const job = await JobManager.get({ id: jobId });
  const [contractors, images, quotes, communications] = await Promise.all([
    JobContractorManager.filter({ jobIds: [jobId] }),
    JobImageManager.filter({ jobIds: [jobId] }),
    QuoteManager.filter({ jobIds: [jobId] }),
    CommunicationManager.filter({ jobIds: [jobId] }),
  ]);
  return { ...job, contractors, images, quotes, communications };
}

/** Updates job fields; throws NotFoundError if the job doesn't exist. */
export async function updateJob(jobId: string, data: UpdateJobData): Promise<Job> {
  return JobManager.update(jobId, { ...data, updatedAt: new Date() });
}

/** Assigns a contractor to a job with an initial status of NOT_CONTACTED. */
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

- Express `req`, `res`, `next` — service functions are pure TypeScript
- HTTP status codes — belong in the route
- Direct DB queries — call a manager method instead
- Calls to `attach*` for reads not needed by the operation — leave that to the caller
