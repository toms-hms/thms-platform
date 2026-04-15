import { JobContractorManager } from '../models/JobContractorManager';
import type { JobContractor } from '../models/JobContractor';

export async function createJobContractor(jobId: string, contractorId: string): Promise<JobContractor> {
  return JobContractorManager.upsert(jobId, contractorId);
}
