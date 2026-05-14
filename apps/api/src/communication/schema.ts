import { z } from 'zod';
import type { TypedRequest } from '@/middleware/auth.middleware';

export const CommunicationSchema = z.object({ communicationId: z.string().min(1) });
export const JobCommunicationsSchema = z.object({ jobId: z.string().min(1) });
export type CommunicationRequest = TypedRequest<z.infer<typeof CommunicationSchema>>;
export type JobCommunicationsRequest = TypedRequest<z.infer<typeof JobCommunicationsSchema>>;

export const UpdateCommunicationSchema = z.object({
  needsReview: z.boolean().optional(),
  parsedSummary: z.string().optional(),
});
