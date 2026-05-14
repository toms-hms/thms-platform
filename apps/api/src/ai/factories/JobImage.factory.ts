import { createId } from '@paralleldrive/cuid2';
import { Factory } from 'fishery';
import { userFactory } from '@/auth/factories/User.factory';
import { jobFactory } from '@/job/factories/Job.factory';
import { JobImageManager } from '@/ai/models/JobImageManager';
import type { JobImage } from '@/ai/models/JobImage';

export const jobImageFactory = Factory.define<JobImage>(({ onCreate, params, sequence }) => {
  onCreate(async (image) => {
    const jobId = params.jobId ?? (await jobFactory.create()).id;
    const uploadedById = params.uploadedById ?? (await userFactory.create()).id;

    return JobImageManager.create({
      ...image,
      jobId,
      uploadedById,
    });
  });

  return {
    id: createId(),
    jobId: params.jobId ?? createId(),
    storageKey: params.storageKey ?? `jobs/test/source/image-${sequence}.jpg`,
    kind: params.kind ?? 'SOURCE',
    label: params.label ?? null,
    aiGenerationId: params.aiGenerationId ?? null,
    uploadedById: params.uploadedById ?? createId(),
    createdAt: new Date(),
  };
});
