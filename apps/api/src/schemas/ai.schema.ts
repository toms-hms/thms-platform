import { z } from 'zod';

export const CreateAIGenerationSchema = z.object({
  sourceImageId: z.string(),
  provider: z.string().default('openai'),
  prompt: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

export const EmailDraftSchema = z.object({
  contractorIds: z.array(z.string()).min(1).max(3),
  tone: z.string().default('professional'),
  includeImages: z.boolean().default(false),
  customInstructions: z.string().optional(),
});
