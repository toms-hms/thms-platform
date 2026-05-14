import { z } from 'zod';
import { JobStatus, JobIntent } from './models/Job';
import { JobContractorStatus } from './models/JobContractor';
import { TradeCategory } from '@/contractor/models/Contractor';
import type {
  TypedParamsRequest,
  TypedQueryRequest,
  TypedParamsQueryRequest,
  TypedParamsBodyRequest,
} from '@/middleware/auth.middleware';

// ─── Path param schemas ───────────────────────────────────────────────────────

// Route params — single item
export const JobParamsSchema = z.object({ jobId: z.string().min(1) });
// Route params — parent-scoped collection
export const HomeJobsParamsSchema = z.object({ homeId: z.string().min(1) });
// Nested resource — carries both parent and child IDs
export const JobContractorParamsSchema = z.object({
  jobId:           z.string().min(1),
  jobContractorId: z.string().min(1),
});

// ─── Query schemas (list filters) ─────────────────────────────────────────────

export const JobsQuerySchema = z.object({
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
  intent:     z.literal('ISSUE'),
  rootCause:  z.string(),
  severity:   z.string(),
  scope:      z.string(),
  priceRange: z.tuple([z.number(), z.number()]),
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
export type GetJobsRequest       = TypedQueryRequest<typeof JobsQuerySchema>;
// GET /jobs/:jobId
export type GetJobRequest        = TypedParamsRequest<typeof JobParamsSchema>;
// GET /homes/:homeId/jobs
export type GetHomeJobsRequest   = TypedParamsQueryRequest<typeof HomeJobsParamsSchema, typeof JobsQuerySchema>;

// POST /homes/:homeId/jobs
export type CreateHomeJobRequest = TypedParamsBodyRequest<typeof HomeJobsParamsSchema, typeof CreateJobSchema>;
// POST /homes/:homeId/jobs/category-suggestions
export type SuggestCategoriesRequest = TypedParamsBodyRequest<typeof HomeJobsParamsSchema, typeof SuggestTradeCategoriesSchema>;

// PATCH /jobs/:jobId
export type UpdateJobRequest     = TypedParamsBodyRequest<typeof JobParamsSchema, typeof UpdateJobSchema>;
// DELETE /jobs/:jobId
export type DeleteJobRequest     = TypedParamsRequest<typeof JobParamsSchema>;

// POST /jobs/:jobId/diagnose
export type DiagnoseRequest      = TypedParamsBodyRequest<typeof JobParamsSchema, typeof DiagnoseSchema>;
// POST /jobs/:jobId/contractors
export type AssignContractorRequest = TypedParamsBodyRequest<typeof JobParamsSchema, typeof AssignContractorSchema>;
// PATCH /jobs/:jobId/contractors/:jobContractorId
export type UpdateJobContractorRequest = TypedParamsBodyRequest<typeof JobContractorParamsSchema, typeof UpdateJobContractorSchema>;
