---
name: api-schema
description: Guide for writing Zod validation schemas — naming, enum usage, discriminated unions, and update-from-create patterns.
---

# API Schema (Zod)

All request validation goes in `src/{module}/schema.ts`. The file exports Zod schemas and their derived request types — no imports from `route.ts` or `service.ts`.

## Naming conventions

| Export | Pattern | Example |
|--------|---------|---------|
| Route params — single item | `XSchema` | `JobSchema` |
| Route params — parent-scoped | `ParentXsSchema` | `HomeJobsSchema` |
| Query params — list | `XsSchema` | `JobsSchema` |
| Create body | `CreateXSchema` | `CreateJobSchema` |
| Update body | `UpdateXSchema` | `UpdateJobSchema` |
| Nested sub-object | descriptive name | `AiSessionSchema` |

Request types are derived from schemas via `TypedRequest` and exported alongside them. Name request types after the route contract, not just the resource. **Every GET handler request type starts with `Get`** so reads are easy to distinguish from mutation contracts.

| Route | Schema input | Request type |
|-------|--------------|--------------|
| `GET /jobs/:jobId` | `JobSchema` params | `GetJobRequest` |
| `GET /homes/:homeId/jobs` | `HomeJobsSchema` params + `JobsSchema` query | `GetHomeJobsRequest` |
| `GET /jobs` | `JobsSchema` query | `GetJobsRequest` |
| `POST /homes/:homeId/jobs` | `HomeJobsSchema` params + `CreateJobSchema` body | `CreateHomeJobRequest` |
| `PATCH /jobs/:jobId` | `JobSchema` params + `UpdateJobSchema` body | `UpdateJobRequest` |
| `DELETE /jobs/:jobId` | `JobSchema` params | `DeleteJobRequest` |

Use the same pattern for other modules: `GetContractorsRequest`, `GetContractorRequest`, `CreateContractorRequest`, `UpdateContractorRequest`, `DeleteContractorRequest`, and parent-scoped reads like `GetContractorJobsRequest`.

## Params and query schemas

```typescript
import { TypedRequest } from '@/middleware/auth.middleware';

// Route params — single item
export const JobSchema = z.object({ jobId: z.string() });

// Route params — parent-scoped collection
export const HomeJobsSchema = z.object({ homeId: z.string() });

// Query params — list (shared by both routers)
export const JobsSchema = z.object({
  status:   z.nativeEnum(JobStatus).optional(),
  category: z.nativeEnum(TradeCategory).optional(),
});

// GET request types
export type GetJobRequest      = TypedRequest<z.infer<typeof JobSchema>>;
export type GetHomeJobsRequest = TypedRequest<z.infer<typeof HomeJobsSchema>, z.infer<typeof JobsSchema>>;
export type GetJobsRequest     = TypedRequest<{}, z.infer<typeof JobsSchema>>;

// Mutation request types
export type CreateHomeJobRequest = TypedRequest<
  z.infer<typeof HomeJobsSchema>,
  {},
  z.infer<typeof CreateJobSchema>
>;
export type UpdateJobRequest = TypedRequest<
  z.infer<typeof JobSchema>,
  {},
  z.infer<typeof UpdateJobSchema>
>;
export type DeleteJobRequest = TypedRequest<z.infer<typeof JobSchema>>;
```

## Using shared enums

Always use `z.nativeEnum(EnumType)` with the enum from `@thms/shared`. Never use `z.enum(['VALUE'])` for model enums — it decouples validation from the shared enum definition.

```typescript
import { JobStatus, JobIntent, TradeCategory } from '@thms/shared';

const schema = z.object({
  intent:   z.nativeEnum(JobIntent).default(JobIntent.ISSUE),
  category: z.nativeEnum(TradeCategory),
  status:   z.nativeEnum(JobStatus).default(JobStatus.DRAFT),
});
```

## Update schema from create

Use `.partial().extend()` to build an update schema from a create schema.

```typescript
export const CreateJobSchema = z.object({
  title:       z.string().min(1),
  intent:      z.nativeEnum(JobIntent).default(JobIntent.ISSUE),
  category:    z.nativeEnum(TradeCategory),
  description: z.string().optional(),
  notes:       z.string().optional(),
  status:      z.nativeEnum(JobStatus).default(JobStatus.DRAFT),
  aiSession:   AiSessionSchema.nullable().optional(),
});

// All fields become optional; aiSession is re-declared to keep its type explicit
export const UpdateJobSchema = CreateJobSchema.partial().extend({
  aiSession: AiSessionSchema.nullable().optional(),
});
```

## Discriminated unions for intent-typed payloads

The AI session summary varies by job intent. Model this as a union discriminated by a literal field.

```typescript
// apps/api/src/job/schema.ts
const ChatMessageSchema = z.object({
  role:    z.enum(['user', 'assistant']),
  content: z.string(),
});

const IssueSummarySchema = z.object({
  intent:      z.literal('ISSUE'),
  rootCause:   z.string(),
  severity:    z.string(),
  scope:       z.string(),
  priceRange:  z.tuple([z.number(), z.number()]),
  constraints: z.array(z.string()),
});

const ImprovementSummarySchema = z.object({
  intent:      z.literal('IMPROVEMENT'),
  scope:       z.string(),
  priceRange:  z.tuple([z.number(), z.number()]),
  constraints: z.array(z.string()),
});

const RecurringSummarySchema = z.object({
  intent:        z.literal('RECURRING_WORK'),
  tasks:         z.array(z.string()).optional(),
  frequency:     z.string(),
  scope:         z.string(),
  estimatedCost: z.tuple([z.number(), z.number()]).optional(),
  priceRange:    z.tuple([z.number(), z.number()]),
  constraints:   z.array(z.string()).optional(),
});

const AiSessionSchema = z.object({
  messages:            z.array(ChatMessageSchema),
  summary:             z.union([IssueSummarySchema, ImprovementSummarySchema, RecurringSummarySchema]).nullable(),
  categorySuggestions: z.array(CategorySuggestionSchema).optional(),
  confirmedCategories: z.array(z.nativeEnum(TradeCategory)).min(1).optional(),
});
```

## Nested object schemas for actions

Action-specific payloads (sub-routes, AI calls) get their own named schemas:

```typescript
export const DiagnoseSchema = z.object({
  message: z.string().min(1),
});

export const SuggestTradeCategoriesSchema = z.object({
  intent:             z.nativeEnum(JobIntent),
  title:              z.string().min(1),
  description:        z.string().optional(),
  selectedCategories: z.array(z.nativeEnum(TradeCategory)).optional(),
});

export const AssignContractorSchema = z.object({
  contractorId: z.string().min(1),
  notes:        z.string().optional(),
});
```

## ID validation

Use `z.string().min(1)` — not `z.string().cuid()`. IDs are CUID2 format which `cuid()` doesn't recognise.

## Where schemas are used

- Imported by `route.ts` into `validate(Schema)` and `validate(Schema, 'query')` middleware calls.
- Types inferred with `z.infer<typeof Schema>` for service function signatures.
- `TypedRequest` compositions exported for use as handler parameter types in `route.ts`.
- Never imported from `service.ts` or `models/`.
