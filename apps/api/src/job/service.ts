import { createId } from '@paralleldrive/cuid2';
import { NotFoundError } from '@/utils/errors';
import { JobManager } from './models/JobManager';
import { JobContractorManager } from './models/JobContractorManager';
import type { z } from 'zod';
import { CreateJobSchema, UpdateJobSchema } from './schema';
import { JobContractorStatus } from './models/JobContractor';
import { JobIntent } from './models/Job';
import { TradeCategory } from '@/contractor/models/Contractor';

export interface TradeCategorySuggestion {
  category: TradeCategory;
  reason: string;
}

type CreateJobData = z.infer<typeof CreateJobSchema> & {
  categories?: TradeCategory[];
  aiSession?: {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    summary: unknown;
    categorySuggestions?: TradeCategorySuggestion[];
    confirmedCategories?: TradeCategory[];
  } | null;
};

type UpdateJobData = Omit<z.infer<typeof UpdateJobSchema>, 'aiSession'> & {
  categories?: TradeCategory[];
  aiSession?: CreateJobData['aiSession'];
};

export async function createJob(homeId: string, userId: string, data: CreateJobData) {
  const confirmedCategories = data.categories?.length ? data.categories : [data.category];
  const aiSession = data.aiSession || data.categories?.length
    ? {
        messages: data.aiSession?.messages ?? [],
        summary: data.aiSession?.summary ?? null,
        categorySuggestions: data.aiSession?.categorySuggestions,
        confirmedCategories,
      }
    : undefined;

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
    aiSession: aiSession as any,
    updatedAt: new Date(),
  });
}

export async function updateJob(jobId: string, data: UpdateJobData) {
  const { categories, aiSession, ...jobData } = data;
  const confirmedCategories = categories?.length ? categories : aiSession?.confirmedCategories;
  return JobManager.update(jobId, {
    ...jobData,
    category: confirmedCategories?.[0] ?? jobData.category,
    aiSession: aiSession || confirmedCategories?.length
      ? {
          messages: aiSession?.messages ?? [],
          summary: aiSession?.summary ?? null,
          categorySuggestions: aiSession?.categorySuggestions,
          confirmedCategories,
        } as any
      : undefined,
  });
}

export async function deleteJob(jobId: string) {
  await JobManager.delete(jobId);
}

export async function assignContractor(jobId: string, contractorId: string, notes?: string) {
  return JobContractorManager.upsert(jobId, contractorId, notes);
}

export async function updateJobContractorStatus(jobContractorId: string, status: JobContractorStatus, notes?: string) {
  const jc = await JobContractorManager.findById(jobContractorId);
  if (!jc) throw new NotFoundError('JobContractor');
  return JobContractorManager.updateStatus(jobContractorId, status as any, notes);
}

export async function removeContractorFromJob(jobContractorId: string) {
  const jc = await JobContractorManager.findById(jobContractorId);
  if (!jc) throw new NotFoundError('JobContractor');
  await JobContractorManager.delete(jobContractorId);
}
