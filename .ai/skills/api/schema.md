---
name: api-schema
description: Guide for writing Zod validation schemas — naming, enum usage, discriminated unions, and update-from-create patterns.
---

# API Schema (Zod)

All request validation goes in `src/{module}/schema.ts`. The file exports only Zod schemas — no imports from `route.ts` or `service.ts`.

## Naming conventions

| Export | Pattern |
|--------|---------|
| Create request | `CreateXSchema` |
| Update request | `UpdateXSchema` |
| Full entity validation | `XSchema` |
| Nested sub-object | descriptive name, e.g. `AiSessionSchema`, `ChatMessageSchema` |

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

Use `.partial().extend()` to build an update schema from a create schema. This avoids duplicating field definitions.

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

The AI session summary varies by job intent. Model this as a union discriminated by a literal field, then make the outer schema accept any variant with `z.union([...])`.

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

- Imported by `route.ts` into `validate(Schema)` middleware calls.
- Types inferred with `z.infer<typeof Schema>` for service function signatures.
- Never imported from `service.ts` or `models/`.
