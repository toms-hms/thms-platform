import { z } from 'zod';
import type {
  TypedParamsRequest,
  TypedQueryRequest,
  TypedParamsBodyRequest,
} from '@/middleware/auth.middleware';

export const CommunicationParamsSchema = z.object({ communicationId: z.string().min(1) });

export const CommunicationsQuerySchema = z.object({
  jobId:        z.string().optional(),
  contractorId: z.string().optional(),
  needsReview:  z.string().optional(),   // 'true' | 'false' as query string
  direction:    z.string().optional(),
});

export type GetCommunicationsRequest  = TypedQueryRequest<typeof CommunicationsQuerySchema>;
export type GetCommunicationRequest   = TypedParamsRequest<typeof CommunicationParamsSchema>;
export type UpdateCommunicationRequest = TypedParamsBodyRequest<typeof CommunicationParamsSchema, typeof UpdateCommunicationSchema>;

export const UpdateCommunicationSchema = z.object({
  needsReview:   z.boolean().optional(),
  parsedSummary: z.string().optional(),
});
