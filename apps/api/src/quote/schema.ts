import { z } from 'zod';
import { QuoteStatus } from '@thms/shared';
import type { TypedRequest } from '@/middleware/auth.middleware';

export const QuoteSchema = z.object({ quoteId: z.string().min(1) });
export const JobQuotesSchema = z.object({ jobId: z.string().min(1) });
export type QuoteRequest = TypedRequest<z.infer<typeof QuoteSchema>>;
export type JobQuotesRequest = TypedRequest<z.infer<typeof JobQuotesSchema>>;

export const CreateQuoteSchema = z.object({
  contractorId: z.string().min(1),
  amount: z.number().positive(),
  description: z.string().optional(),
  status: z.nativeEnum(QuoteStatus).default(QuoteStatus.DRAFT),
  sourceCommunicationId: z.string().optional(),
});

export const UpdateQuoteSchema = z.object({
  amount: z.number().positive().optional(),
  description: z.string().optional(),
  status: z.nativeEnum(QuoteStatus).optional(),
});
