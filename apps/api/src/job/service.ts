import { createId } from '@paralleldrive/cuid2';
import { NotFoundError } from '../utils/errors';
import { JobManager } from './models/JobManager';
import { JobContractorManager } from './models/JobContractorManager';
import { UserHomeManager } from '../home/models/UserHomeManager';
import type { CreateJobInput, UpdateJobInput } from '@thms/shared';
import { JobContractorStatus } from '@thms/shared';

export async function listJobs(homeId: string, userId: string, filters?: { status?: string; category?: string }) {
  return JobManager.listForHome(homeId, userId, filters);
}

export async function createJob(homeId: string, userId: string, data: CreateJobInput) {
  await UserHomeManager.assertMembership(userId, homeId);
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

export async function getJob(jobId: string, userId: string) {
  const job = await JobManager.findByIdForUser(jobId, userId);

  const [contractors, images, quotes, communications, aiGenerations] = await Promise.all([
    JobContractorManager.listForJob(jobId),
    import('../ai/models/JobImageManager').then((m) => m.JobImageManager.listForJob(jobId)),
    import('../quote/models/QuoteManager').then((m) => m.QuoteManager.listForJob(jobId)),
    import('../communication/models/CommunicationManager').then((m) => m.CommunicationManager.listForJob(jobId)),
    import('../ai/models/AIGenerationManager').then((m) => m.AIGenerationManager.listForJob(jobId)),
  ]);

  return { ...job, contractors, images, quotes, communications, aiGenerations };
}

export async function updateJob(jobId: string, userId: string, data: UpdateJobInput) {
  await JobManager.findByIdForUser(jobId, userId);
  return JobManager.update(jobId, data);
}

export async function deleteJob(jobId: string, userId: string) {
  await JobManager.findByIdForUser(jobId, userId);
  await JobManager.delete(jobId);
}

export async function assignContractor(jobId: string, userId: string, contractorId: string, notes?: string) {
  await JobManager.findByIdForUser(jobId, userId);
  return JobContractorManager.upsert(jobId, contractorId, notes);
}

export async function updateJobContractorStatus(jobContractorId: string, userId: string, status: JobContractorStatus, notes?: string) {
  const jc = await JobContractorManager.findById(jobContractorId);
  if (!jc) throw new NotFoundError('JobContractor');
  await JobManager.findByIdForUser(jc.jobId, userId);
  return JobContractorManager.updateStatus(jobContractorId, status as any, notes);
}

export async function removeContractorFromJob(jobContractorId: string, userId: string) {
  const jc = await JobContractorManager.findById(jobContractorId);
  if (!jc) throw new NotFoundError('JobContractor');
  await JobManager.findByIdForUser(jc.jobId, userId);
  await JobContractorManager.delete(jobContractorId);
}
