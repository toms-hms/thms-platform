import { Factory } from 'fishery';
import { createId } from '@paralleldrive/cuid2';
import { contractorFactory } from '@/contractor/factories/Contractor.factory';
import { jobFactory } from '@/job/factories/Job.factory';
import { JobContractorManager } from '@/job/models/JobContractorManager';
import { JobContractorStatus } from '@thms/shared';
import type { JobContractor } from '@/job/models/JobContractor';

export const jobContractorFactory = Factory.define<JobContractor>(({ onCreate, params }) => {
  onCreate(async (jc) => {
    const jobId = params.jobId ?? (await jobFactory.create()).id;
    const contractorId = params.contractorId ?? (await contractorFactory.create()).id;

    return JobContractorManager.upsert(jobId, contractorId, jc.notes ?? undefined);
  });

  return {
    id:              createId(),
    jobId:           params.jobId ?? createId(),
    contractorId:    params.contractorId ?? createId(),
    status:          params.status ?? JobContractorStatus.NOT_CONTACTED,
    lastContactedAt: null,
    lastResponseAt:  null,
    notes:           params.notes ?? null,
    createdAt:       new Date(),
    updatedAt:       new Date(),
  };
});
