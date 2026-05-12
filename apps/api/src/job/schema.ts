import { z } from 'zod';
import { JobStatus, JobContractorStatus, JobIntent, TradeCategory } from '@thms/shared';

const CategorySuggestionSchema = z.object({
  category: z.nativeEnum(TradeCategory),
  reason: z.string().min(1),
});

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

const IssueSummarySchema = z.object({
  intent: z.literal('ISSUE'),
  rootCause: z.string(),
  severity: z.string(),
  scope: z.string(),
  priceRange: z.tuple([z.number(), z.number()]),
  constraints: z.array(z.string()),
});

const ImprovementSummarySchema = z.object({
  intent: z.literal('IMPROVEMENT'),
  scope: z.string(),
  priceRange: z.tuple([z.number(), z.number()]),
  constraints: z.array(z.string()),
});

const RecurringSummarySchema = z.object({
  intent: z.literal('RECURRING_WORK'),
  tasks: z.array(z.string()).optional(),
  frequency: z.string(),
  scope: z.string(),
  estimatedCost: z.tuple([z.number(), z.number()]).optional(),
  priceRange: z.tuple([z.number(), z.number()]),
  constraints: z.array(z.string()).optional(),
});

const AiSessionSchema = z.object({
  messages: z.array(ChatMessageSchema),
  summary: z.union([IssueSummarySchema, ImprovementSummarySchema, RecurringSummarySchema]).nullable(),
  categorySuggestions: z.array(CategorySuggestionSchema).optional(),
  confirmedCategories: z.array(z.nativeEnum(TradeCategory)).min(1).optional(),
});

export const CreateJobSchema = z.object({
  title: z.string().min(1),
  intent: z.nativeEnum(JobIntent).default(JobIntent.ISSUE),
  category: z.nativeEnum(TradeCategory),
  categories: z.array(z.nativeEnum(TradeCategory)).min(1).optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  status: z.nativeEnum(JobStatus).default(JobStatus.DRAFT),
  aiSession: AiSessionSchema.nullable().optional(),
});

export const UpdateJobSchema = CreateJobSchema.partial().extend({
  aiSession: AiSessionSchema.nullable().optional(),
});

export const DiagnoseSchema = z.object({
  message: z.string().min(1),
});

export const SuggestTradeCategoriesSchema = z.object({
  intent: z.nativeEnum(JobIntent),
  title: z.string().min(1),
  description: z.string().optional(),
  selectedCategories: z.array(z.nativeEnum(TradeCategory)).optional(),
});

export const AssignContractorSchema = z.object({
  contractorId: z.string().min(1),
  notes: z.string().optional(),
});

export const UpdateJobContractorSchema = z.object({
  status: z.nativeEnum(JobContractorStatus),
  notes: z.string().optional(),
});
