import { z } from 'zod';
import { QuoteStatus } from '@/quote/models/Quote';
import type {
  TypedParamsRequest,
  TypedParamsBodyRequest,
} from '@/middleware/auth.middleware';

export const QuoteParamsSchema     = z.object({ quoteId: z.string().min(1) });
export const JobQuotesParamsSchema = z.object({ jobId:   z.string().min(1) });

export type GetJobQuotesRequest   = TypedParamsRequest<typeof JobQuotesParamsSchema>;
export type GetQuoteRequest       = TypedParamsRequest<typeof QuoteParamsSchema>;
export type CreateJobQuoteRequest = TypedParamsBodyRequest<typeof JobQuotesParamsSchema, typeof CreateQuoteSchema>;
export type UpdateQuoteRequest    = TypedParamsBodyRequest<typeof QuoteParamsSchema, typeof UpdateQuoteSchema>;
export type DeleteQuoteRequest    = TypedParamsRequest<typeof QuoteParamsSchema>;

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
