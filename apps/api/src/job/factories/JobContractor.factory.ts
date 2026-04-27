import { Factory } from 'fishery';
import { JobContractorManager } from '@/job/models/JobContractorManager';
import type { JobContractor } from '@/job/models/JobContractor';

export const jobContractorFactory = Factory.define<JobContractor, { jobId: string; contractorId: string }>(({ onCreate, transientParams }) => {
  onCreate((jc) => JobContractorManager.upsert(jc.jobId, jc.contractorId));

  return {
    jobId: transientParams.jobId ?? '',
    contractorId: transientParams.contractorId ?? '',
  };
});
