import { createId } from '@paralleldrive/cuid2';
import { Factory } from 'fishery';
import { userFactory } from '@/auth/factories/User.factory';
import { homeFactory } from '@/home/factories/Home.factory';
import { JobManager } from '@/job/models/JobManager';
import { TradeCategory, JobIntent, JobStatus } from '@thms/shared';
import type { Job } from '@/job/models/Job';

export const jobFactory = Factory.define<Job>(({ onCreate, params, sequence }) => {
  onCreate(async (job) => {
    const createdByUserId = params.createdByUserId ?? (await userFactory.create()).id;
    const homeId = params.homeId ?? (await homeFactory.create()).id;

    return JobManager.create({
      ...job,
      homeId,
      createdByUserId,
    });
  });

  return {
    id: createId(),
    homeId: params.homeId ?? createId(),
    createdByUserId: params.createdByUserId ?? createId(),
    title: params.title ?? `Test Job ${sequence}`,
    intent: params.intent ?? JobIntent.ISSUE,
    category: params.category ?? TradeCategory.PLUMBING,
    description: params.description ?? null,
    notes: params.notes ?? null,
    status: params.status ?? JobStatus.DRAFT,
    aiSession: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
});
