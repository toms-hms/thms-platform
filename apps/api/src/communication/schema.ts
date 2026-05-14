import { z } from 'zod';
import type {
  TypedParamsRequest,
  TypedParamsBodyRequest,
} from '@/middleware/auth.middleware';

export const CommunicationParamsSchema     = z.object({ communicationId: z.string().min(1) });
export const JobCommunicationsParamsSchema = z.object({ jobId:           z.string().min(1) });

export type GetJobCommunicationsRequest = TypedParamsRequest<typeof JobCommunicationsParamsSchema>;
export type GetCommunicationRequest     = TypedParamsRequest<typeof CommunicationParamsSchema>;
export type UpdateCommunicationRequest  = TypedParamsBodyRequest<typeof CommunicationParamsSchema, typeof UpdateCommunicationSchema>;

export const UpdateCommunicationSchema = z.object({
  needsReview: z.boolean().optional(),
  parsedSummary: z.string().optional(),
});
