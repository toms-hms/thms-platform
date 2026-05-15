import { z } from 'zod';
import { JobStatus, JobIntent } from './models/Job';
import { TradeCategory } from '@/contractor/models/Contractor';
import type {
  TypedParamsRequest,
  TypedQueryRequest,
  TypedBodyRequest,
  TypedParamsBodyRequest,
} from '@/middleware/auth.middleware';

// ─── Path param schemas ───────────────────────────────────────────────────────

export const JobParamsSchema = z.object({ jobId: z.string().min(1) });

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

export const CreateJobSchema = z.object({
  homeId:      z.string().min(1),            // parent context in body, not URL
  title:       z.string().min(1),
  intent:      z.nativeEnum(JobIntent).default(JobIntent.ISSUE),
  category:    z.nativeEnum(TradeCategory),
  categories:  z.array(z.nativeEnum(TradeCategory)).min(1).optional(),
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
