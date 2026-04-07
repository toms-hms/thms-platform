import { z } from 'zod';

export const UpdateCommunicationSchema = z.object({
  needsReview: z.boolean().optional(),
  parsedSummary: z.string().optional(),
});
