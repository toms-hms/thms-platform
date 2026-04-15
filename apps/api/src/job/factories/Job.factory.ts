import { createId } from '@paralleldrive/cuid2';
import { JobManager } from '../models/JobManager';
import { TradeCategory } from '@thms/shared';
import type { Job } from '../models/Job';

export async function createJob(homeId: string, userId: string, overrides?: Partial<{ title: string; category: TradeCategory }>): Promise<Job> {
  return JobManager.create({
    id: createId(),
    homeId,
    createdByUserId: userId,
    title: overrides?.title ?? 'Test Job',
    category: overrides?.category ?? TradeCategory.PLUMBING,
    description: null,
    notes: null,
    status: 'DRAFT',
    updatedAt: new Date(),
  });
}
