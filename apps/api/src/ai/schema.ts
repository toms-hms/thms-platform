import { z } from 'zod';
import type {
  TypedQueryRequest,
  TypedBodyRequest,
} from '@/middleware/auth.middleware';

export const AIGenerationsQuerySchema = z.object({ jobId: z.string().optional() });

export const CreateAIGenerationSchema = z.object({
  jobId:         z.string().min(1),
  sourceImageId: z.string(),
  provider:      z.string().default('openai'),
  prompt:        z.string().min(1),
  metadata:      z.record(z.unknown()).optional(),
});

export const EmailDraftSchema = z.object({
  contractorIds:      z.array(z.string()).min(1).max(3),
  tone:               z.string().default('professional'),
  includeImages:      z.boolean().default(false),
  customInstructions: z.string().optional(),
});

// ─── Request types ────────────────────────────────────────────────────────────

// GET /ai-generations
export type GetAIGenerationsRequest   = TypedQueryRequest<typeof AIGenerationsQuerySchema>;
// POST /ai-generations
export type CreateAIGenerationRequest = TypedBodyRequest<typeof CreateAIGenerationSchema>;
