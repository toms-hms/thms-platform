---
name: shared-types
description: Guide for adding types to the @thms/shared package — Dto vs Input interfaces, enum placement, and cross-app import rules.
---

# Shared Package Types (`@thms/shared`)

Types and enums that are used by both `apps/api` and `apps/web` live in `packages/shared/src/types/`. The package is imported as `@thms/shared`.

## File structure

```
packages/shared/src/
  index.ts               — re-exports everything; add new type files here
  types/
    trade-category.ts    — TradeCategory enum
    job-intent.ts        — JobIntent enum
    job.ts               — JobStatus enum, JobDto, CreateJobInput, UpdateJobInput
    job-contractor.ts    — JobContractorStatus, JobContractorDto
    contractor.ts        — ContractorDto, CreateContractorInput, UpdateContractorInput
    home.ts              — HomeDto, CreateHomeInput
    user.ts              — UserRole enum, UserDto
    ai.ts                — AiSession, ChatMessage, intent-discriminated summaries
    communication.ts     — CommunicationDto
    quote.ts             — QuoteDto
    my-vendor.ts         — MyVendorDto
    integration.ts       — IntegrationDto
    api.ts               — ApiResponse wrapper type
```

## When to add to shared

Add a type to `@thms/shared` when:
- Both `apps/api` and `apps/web` reference it (e.g. a Dto shape that the API returns and the web renders).
- It's a domain constant (enum value, status list) used across the codebase.

Keep types in the API when they are purely internal (manager option interfaces, service-layer types not visible to the web).

## Dto vs Input naming

| Pattern | Use |
|---|---|
| `XDto` | What the API returns to the client. The web renders these. |
| `CreateXInput` | Request body for POST requests. |
| `UpdateXInput` | Request body for PATCH requests (usually all fields optional). |
| `XStatus` enum | Status values for a model (e.g. `JobStatus`, `JobContractorStatus`). |

```typescript
// packages/shared/src/types/job.ts
export enum JobStatus {
  DRAFT            = 'DRAFT',
  PLANNING         = 'PLANNING',
  REACHING_OUT     = 'REACHING_OUT',
  COMPARING_QUOTES = 'COMPARING_QUOTES',
  SCHEDULED        = 'SCHEDULED',
  IN_PROGRESS      = 'IN_PROGRESS',
  AWAITING_PAYMENT = 'AWAITING_PAYMENT',
  COMPLETED        = 'COMPLETED',
}

export interface JobDto {
  id:              string;
  homeId:          string;
  title:           string;
  intent:          JobIntent;
  category:        TradeCategory;
  description?:    string;
  notes?:          string;
  status:          JobStatus;
  aiSession?:      AiSession | null;
  createdByUserId: string;
  createdAt:       string;
  updatedAt:       string;
}

export interface CreateJobInput {
  title:       string;
  intent:      JobIntent;
  category:    TradeCategory;
  description?: string;
  notes?:       string;
  status?:      JobStatus;
}

export interface UpdateJobInput {
  title?:       string;
  intent?:      JobIntent;
  category?:    TradeCategory;
  description?: string;
  notes?:       string;
  status?:      JobStatus;
  aiSession?:   AiSession | null;
}
```

## JSONB type example — AiSession

Types for JSONB columns (`aiSession`, `metadata`) live in `packages/shared/src/types/ai.ts`. The API uses `.$type<AiSession>()` on the Drizzle column; the web renders these fields directly.

```typescript
// packages/shared/src/types/ai.ts
export interface ChatMessage {
  role:    'user' | 'assistant';
  content: string;
}

export interface IssueSummary {
  intent:      'ISSUE';
  rootCause:   string;
  severity:    string;
  scope:       string;
  priceRange:  [number, number];
  constraints: string[];
}

export interface ImprovementSummary {
  intent:      'IMPROVEMENT';
  scope:       string;
  priceRange:  [number, number];
  constraints: string[];
}

export interface RecurringSummary {
  intent:         'RECURRING_WORK';
  tasks?:         string[];
  frequency:      string;
  scope:          string;
  estimatedCost?: [number, number];
  priceRange:     [number, number];
  constraints?:   string[];
}

export type AiSessionSummary = IssueSummary | ImprovementSummary | RecurringSummary;

export interface AiSession {
  messages:            ChatMessage[];
  summary:             AiSessionSummary | null;
  categorySuggestions?: Array<{ category: string; reason: string }>;
  confirmedCategories?: string[];
}
```

## Adding a new type file

1. Create `packages/shared/src/types/my-new-thing.ts`
2. Add an export line to `packages/shared/src/index.ts`:
   ```typescript
   export * from './types/my-new-thing';
   ```

## Cross-app import rule

**Never import from one app into the other.** Use `@thms/shared` as the only cross-app boundary.

```typescript
// Good — API uses shared type for service function signature
import type { CreateJobInput } from '@thms/shared';

// Good — web uses shared enum for display
import { TradeCategory, JobStatus } from '@thms/shared';

// Bad — web importing from API
import { jobs } from '../../apps/api/src/job/models/Job'; // ❌
```
