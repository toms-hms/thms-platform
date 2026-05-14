import { createId } from '@paralleldrive/cuid2';
import { Factory } from 'fishery';
import { userFactory } from '@/auth/factories/User.factory';
import { jobFactory } from '@/job/factories/Job.factory';
import { AIGenerationManager } from '@/ai/models/AIGenerationManager';
import type { AIGeneration } from '@/ai/models/AIGeneration';

export const aiGenerationFactory = Factory.define<AIGeneration>(({ onCreate, params }) => {
  onCreate(async (generation) => {
    const jobId = params.jobId ?? (await jobFactory.create()).id;
    const createdByUserId = params.createdByUserId ?? (await userFactory.create()).id;

    return AIGenerationManager.create({
      ...generation,
      jobId,
      createdByUserId,
    });
  });

  return {
    id: createId(),
    jobId: params.jobId ?? createId(),
    originalImageUrl: params.originalImageUrl ?? null,
    prompt: params.prompt ?? 'Make it green',
    generatedImageUrl: params.generatedImageUrl ?? null,
    provider: params.provider ?? 'openai',
    status: params.status ?? 'PENDING',
    metadata: params.metadata ?? null,
    createdByUserId: params.createdByUserId ?? createId(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
});
