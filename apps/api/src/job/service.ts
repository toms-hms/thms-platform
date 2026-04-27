import { createId } from '@paralleldrive/cuid2';
import { NotFoundError } from '../utils/errors';
import { JobManager } from './models/JobManager';
import { JobContractorManager } from './models/JobContractorManager';
import type { CreateJobInput, UpdateJobInput } from '@thms/shared';
import { JobContractorStatus } from '@thms/shared';

export async function createJob(homeId: string, userId: string, data: CreateJobInput) {
  return JobManager.create({
    id: createId(),
    homeId,
    createdByUserId: userId,
    title: data.title,
    category: data.category,
    description: data.description ?? null,
    notes: data.notes ?? null,
    status: data.status ?? 'DRAFT',
    updatedAt: new Date(),
  });
}

export async function getJob(jobId: string) {
  const job = await JobManager.findById(jobId);
  if (!job) throw new NotFoundError('Job');

  const [contractors, images, quotes, communications, aiGenerations] = await Promise.all([
    JobContractorManager.listForJob(jobId),
    import('../ai/models/JobImageManager').then((m) => m.JobImageManager.listForJob(jobId)),
    import('../quote/models/QuoteManager').then((m) => m.QuoteManager.listForJob(jobId)),
    import('../communication/models/CommunicationManager').then((m) => m.CommunicationManager.listForJob(jobId)),
    import('../ai/models/AIGenerationManager').then((m) => m.AIGenerationManager.listForJob(jobId)),
  ]);

  return { ...job, contractors, images, quotes, communications, aiGenerations };
}

export async function updateJob(jobId: string, data: UpdateJobInput) {
  return JobManager.update(jobId, data);
}

export async function deleteJob(jobId: string) {
  await JobManager.delete(jobId);
}

export async function listJobContractors(jobId: string) {
  return JobContractorManager.listForJob(jobId);
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
