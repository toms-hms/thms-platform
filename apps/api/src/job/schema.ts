import { z } from 'zod';
import { JobStatus, JobContractorStatus, JobIntent, TradeCategory } from '@thms/shared';

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

const IssueSummarySchema = z.object({
  kind: z.literal('ISSUE'),
  rootCause: z.string(),
  severity: z.string(),
  scope: z.string(),
  priceRange: z.tuple([z.number(), z.number()]),
  constraints: z.array(z.string()),
});

const ImprovementSummarySchema = z.object({
  kind: z.literal('IMPROVEMENT'),
  scope: z.string(),
  priceRange: z.tuple([z.number(), z.number()]),
  constraints: z.array(z.string()),
});

const RecurringSummarySchema = z.object({
  kind: z.literal('RECURRING_WORK'),
  frequency: z.string(),
  scope: z.string(),
  priceRange: z.tuple([z.number(), z.number()]),
});

const AiSessionSchema = z.object({
  messages: z.array(ChatMessageSchema),
  summary: z.union([IssueSummarySchema, ImprovementSummarySchema, RecurringSummarySchema]).nullable(),
});

export const CreateJobSchema = z.object({
  title: z.string().min(1),
  intent: z.nativeEnum(JobIntent).default(JobIntent.ISSUE),
  category: z.nativeEnum(TradeCategory),
  description: z.string().optional(),
  notes: z.string().optional(),
  status: z.nativeEnum(JobStatus).default(JobStatus.DRAFT),
});

export const UpdateJobSchema = CreateJobSchema.partial().extend({
  aiSession: AiSessionSchema.nullable().optional(),
});

export const AssignContractorSchema = z.object({
  contractorId: z.string().min(1),
  notes: z.string().optional(),
});

export const UpdateJobContractorSchema = z.object({
  status: z.nativeEnum(JobContractorStatus),
  notes: z.string().optional(),
});
