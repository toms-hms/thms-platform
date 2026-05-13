import { Factory } from 'fishery';
import { createId } from '@paralleldrive/cuid2';
import { JobContractorManager } from '@/job/models/JobContractorManager';
import type { JobContractor } from '@/job/models/JobContractor';

export const jobContractorFactory = Factory.define<JobContractor, { jobId: string; contractorId: string }>(({ onCreate, transientParams }) => {
  onCreate((jc) => JobContractorManager.upsert(jc.jobId, jc.contractorId));

  return {
    id:              createId(),
    jobId:           transientParams.jobId ?? '',
    contractorId:    transientParams.contractorId ?? '',
    status:          'NOT_CONTACTED',
    lastContactedAt: null,
    lastResponseAt:  null,
    notes:           null,
    createdAt:       new Date(),
    updatedAt:       new Date(),
  };
});
