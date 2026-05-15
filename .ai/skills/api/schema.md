---
name: api-schema
description: Guide for writing Zod validation schemas — naming, enum usage, discriminated unions, and update-from-create patterns.
---

# API Schema (Zod)

All request validation goes in `src/{module}/schema.ts`. The file exports Zod schemas and their derived request types — no imports from `route.ts` or `service.ts`.

## Naming conventions

Two sources, two rules:

| Source | Schema pattern | Example |
|--------|---------------|---------|
| Path params | `XParamsSchema` | `JobParamsSchema` |
| Query params (list filters) | `XsQuerySchema` | `JobsQuerySchema` |
| Create body | `CreateXSchema` | `CreateJobSchema` |
| Update body | `UpdateXSchema` | `UpdateJobSchema` |
| Action body (sub-route) | descriptive name | `AssignContractorSchema`, `DiagnoseSchema` |
| Nested sub-object | descriptive name | `AiSessionSchema` |

**No parent-scoped param schemas.** There is no `ParentXsParamsSchema` pattern. Parent IDs belong in the body (POST) or query (GET), not in a separate URL segment. See the route skill for the flat resource design.

**Why no `Body` suffix on create/update?** `Create` and `Update` unambiguously mean request body — adding `Body` is redundant. `Params` and `Query` earn their suffixes because the name alone doesn't tell you the source.

Request types are named after the HTTP operation, not the schema:

| Route | Schemas used | Request type |
|-------|-------------|--------------|
| `GET /jobs` | `JobsQuerySchema` query (includes optional `homeId`) | `GetJobsRequest` |
| `GET /jobs/:jobId` | `JobParamsSchema` params | `GetJobRequest` |
| `POST /jobs` | `CreateJobSchema` body (includes `homeId`) | `CreateJobRequest` |
| `PATCH /jobs/:jobId` | `JobParamsSchema` params + `UpdateJobSchema` body | `UpdateJobRequest` |
| `DELETE /jobs/:jobId` | `JobParamsSchema` params | `DeleteJobRequest` |
| `POST /jobs/:jobId/contractors` | `JobParamsSchema` params + `AssignContractorSchema` body | `AssignContractorRequest` |
| `GET /contractors` | `ContractorsQuerySchema` query | `GetContractorsRequest` |
| `GET /contractors/:contractorId` | `ContractorParamsSchema` params | `GetContractorRequest` |
| `GET /quotes/:quoteId` | `QuoteParamsSchema` params | `GetQuoteRequest` |
| `GET /homes/:homeId` | `HomeParamsSchema` params | `GetHomeRequest` |
| `PATCH /homes/:homeId` | `HomeParamsSchema` params + `UpdateHomeSchema` body | `UpdateHomeRequest` |

## Request helpers

`TypedRequest` is the low-level shape. Always use these schema-aware aliases from `@/middleware/auth.middleware` — they take the Zod schema type directly, not the inferred type:

```typescript
import type {
  TypedParamsRequest,
  TypedQueryRequest,
  TypedParamsQueryRequest,
  TypedBodyRequest,
  TypedParamsBodyRequest,
} from '@/middleware/auth.middleware';
```

| Helper | Use for | Example |
|--------|---------|---------|
| `TypedParamsRequest<P>` | path params only | `GET /jobs/:jobId`, `DELETE /jobs/:jobId` |
| `TypedQueryRequest<Q>` | query only | `GET /jobs?status=DRAFT` |
| `TypedParamsQueryRequest<P, Q>` | path params + query | `GET /homes/:homeId/jobs?status=DRAFT` |
| `TypedBodyRequest<B>` | body only (no path params) | `POST /jobs` |
| `TypedParamsBodyRequest<P, B>` | path params + body | `PATCH /jobs/:jobId`, `POST /homes/:homeId/jobs` |

## Full job module example

```typescript
// apps/api/src/job/schema.ts
import { z } from 'zod';
import { JobStatus, JobContractorStatus, JobIntent, TradeCategory } from '@thms/shared';
import type {
  TypedParamsRequest,
  TypedQueryRequest,
  TypedParamsQueryRequest,
  TypedParamsBodyRequest,
} from '@/middleware/auth.middleware';

// ─── Path param schemas ───────────────────────────────────────────────────────

export const JobParamsSchema = z.object({ jobId: z.string().min(1) });
export const JobContractorParamsSchema = z.object({
  jobId:           z.string().min(1),
  jobContractorId: z.string().min(1),
});

// ─── Query schemas (list filters) ─────────────────────────────────────────────

export const JobsQuerySchema = z.object({
  homeId:   z.string().optional(),           // filter by home; permission checked inline
  status:   z.nativeEnum(JobStatus).optional(),
  category: z.nativeEnum(TradeCategory).optional(),
});

// ─── Body schemas ─────────────────────────────────────────────────────────────

const CategorySuggestionSchema = z.object({
  category: z.nativeEnum(TradeCategory),
  reason:   z.string().min(1),
});

// (AiSessionSchema, ChatMessageSchema, summary schemas omitted for brevity — see full file)

export const CreateJobSchema = z.object({
  title:       z.string().min(1),
  intent:      z.nativeEnum(JobIntent).default(JobIntent.ISSUE),
  category:    z.nativeEnum(TradeCategory),
  description: z.string().optional(),
  notes:       z.string().optional(),
  status:      z.nativeEnum(JobStatus).default(JobStatus.DRAFT),
  aiSession:   AiSessionSchema.nullable().optional(),
});

export const UpdateJobSchema = CreateJobSchema.partial().extend({
  aiSession: AiSessionSchema.nullable().optional(),
});

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

export const UpdateJobContractorSchema = z.object({
  status: z.nativeEnum(JobContractorStatus),
  notes:  z.string().optional(),
});

// ─── Request types ────────────────────────────────────────────────────────────

// GET /jobs
export type GetJobsRequest             = TypedQueryRequest<typeof JobsQuerySchema>;
// GET /jobs/:jobId
export type GetJobRequest              = TypedParamsRequest<typeof JobParamsSchema>;
// POST /jobs  (homeId in body)
export type CreateJobRequest           = TypedBodyRequest<typeof CreateJobSchema>;
// POST /jobs/category-suggestions
export type SuggestCategoriesRequest   = TypedBodyRequest<typeof SuggestTradeCategoriesSchema>;
// PATCH /jobs/:jobId
export type UpdateJobRequest           = TypedParamsBodyRequest<typeof JobParamsSchema, typeof UpdateJobSchema>;
// DELETE /jobs/:jobId
export type DeleteJobRequest           = TypedParamsRequest<typeof JobParamsSchema>;
// POST /jobs/:jobId/diagnose
export type DiagnoseRequest            = TypedParamsBodyRequest<typeof JobParamsSchema, typeof DiagnoseSchema>;
// POST /jobs/:jobId/contractors
export type AssignContractorRequest    = TypedParamsBodyRequest<typeof JobParamsSchema, typeof AssignContractorSchema>;
// PATCH /jobs/:jobId/contractors/:jobContractorId
export type UpdateJobContractorRequest = TypedParamsBodyRequest<typeof JobContractorParamsSchema, typeof UpdateJobContractorSchema>;
```

## Other modules — schema pattern

Every module follows the same structure. Examples:

```typescript
// home/schema.ts
export const HomeParamsSchema  = z.object({ homeId: z.string().min(1) });
export type GetHomeRequest     = TypedParamsRequest<typeof HomeParamsSchema>;
export type UpdateHomeRequest  = TypedParamsBodyRequest<typeof HomeParamsSchema, typeof UpdateHomeSchema>;
export type DeleteHomeRequest  = TypedParamsRequest<typeof HomeParamsSchema>;

// contractor/schema.ts
export const ContractorParamsSchema = z.object({ contractorId: z.string().min(1) });
export const ContractorsQuerySchema = z.object({
  search:           z.string().optional(),
  tradeCategories:  z.array(z.nativeEnum(TradeCategory)).optional(),
  zipCodes:         z.array(z.string()).optional(),
});
export type GetContractorsRequest  = TypedQueryRequest<typeof ContractorsQuerySchema>;
export type GetContractorRequest   = TypedParamsRequest<typeof ContractorParamsSchema>;
export type CreateContractorRequest = TypedBodyRequest<typeof CreateContractorSchema>;
export type UpdateContractorRequest = TypedParamsBodyRequest<typeof ContractorParamsSchema, typeof UpdateContractorSchema>;
export type DeleteContractorRequest = TypedParamsRequest<typeof ContractorParamsSchema>;

// quote/schema.ts
export const QuoteParamsSchema     = z.object({ quoteId: z.string().min(1) });
export const JobQuotesParamsSchema = z.object({ jobId:   z.string().min(1) });
export type GetJobQuotesRequest    = TypedParamsRequest<typeof JobQuotesParamsSchema>;
export type GetQuoteRequest        = TypedParamsRequest<typeof QuoteParamsSchema>;
export type CreateJobQuoteRequest  = TypedParamsBodyRequest<typeof JobQuotesParamsSchema, typeof CreateQuoteSchema>;
export type UpdateQuoteRequest     = TypedParamsBodyRequest<typeof QuoteParamsSchema, typeof UpdateQuoteSchema>;
export type DeleteQuoteRequest     = TypedParamsRequest<typeof QuoteParamsSchema>;

// communication/schema.ts
export const CommunicationParamsSchema    = z.object({ communicationId: z.string().min(1) });
export const JobCommunicationsParamsSchema = z.object({ jobId:           z.string().min(1) });
export type GetJobCommunicationsRequest   = TypedParamsRequest<typeof JobCommunicationsParamsSchema>;
export type GetCommunicationRequest       = TypedParamsRequest<typeof CommunicationParamsSchema>;
export type UpdateCommunicationRequest    = TypedParamsBodyRequest<typeof CommunicationParamsSchema, typeof UpdateCommunicationSchema>;

// integration/schema.ts
export const IntegrationParamsSchema = z.object({ integrationId: z.string().min(1) });
export type GetIntegrationsRequest   = TypedRequest;            // no params or query filters
export type GetIntegrationRequest    = TypedParamsRequest<typeof IntegrationParamsSchema>;
export type DeleteIntegrationRequest = TypedParamsRequest<typeof IntegrationParamsSchema>;

// userContractor/schema.ts
export const UserContractorParamsSchema = z.object({ userContractorId: z.string().min(1) });
export type GetUserContractorRequest    = TypedParamsRequest<typeof UserContractorParamsSchema>;
export type CreateUserContractorRequest = TypedBodyRequest<typeof CreateUserContractorSchema>;
export type DeleteUserContractorRequest = TypedParamsRequest<typeof UserContractorParamsSchema>;
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
  homeId:      z.string().min(1),            // parent context in body, not URL
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

```typescript
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

## ID validation

Use `z.string().min(1)` — not `z.string().cuid()`. IDs are CUID2 format which `cuid()` doesn't recognise.

## Where schemas are used

- Imported by `route.ts` into `validate(Schema, 'params')`, `validate(Schema, 'query')`, or `validate(Schema)` (body) middleware calls.
- Types inferred with `z.infer<typeof Schema>` for service function signatures.
- Request type aliases exported for use as handler parameter types in `route.ts`.
- Never imported from `service.ts` or `models/`.
