import { createId } from '@paralleldrive/cuid2';
import { Factory } from 'fishery';
import { JobManager } from '@/job/models/JobManager';
import { TradeCategory, JobIntent } from '@thms/shared';
import type { Job } from '@/job/models/Job';

export const jobFactory = Factory.define<Job, { homeId: string; userId: string }>(({ onCreate, transientParams, sequence }) => {
  onCreate((job) => JobManager.create(job));

  return {
    id: createId(),
    homeId: transientParams.homeId ?? '',
    createdByUserId: transientParams.userId ?? '',
    title: `Test Job ${sequence}`,
    intent: JobIntent.ISSUE,
    category: TradeCategory.PLUMBING,
    description: null,
    notes: null,
    status: 'DRAFT',
    aiSession: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
});
