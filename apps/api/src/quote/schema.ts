import { z } from 'zod';
import { QuoteStatus } from '@/quote/models/Quote';
import type {
  TypedParamsRequest,
  TypedQueryRequest,
  TypedBodyRequest,
  TypedParamsBodyRequest,
} from '@/middleware/auth.middleware';

export const QuoteParamsSchema  = z.object({ quoteId: z.string().min(1) });
export const QuotesQuerySchema  = z.object({ jobId: z.string().optional() });

export type GetQuotesRequest   = TypedQueryRequest<typeof QuotesQuerySchema>;
export type GetQuoteRequest    = TypedParamsRequest<typeof QuoteParamsSchema>;
export type CreateQuoteRequest = TypedBodyRequest<typeof CreateQuoteSchema>;
export type UpdateQuoteRequest = TypedParamsBodyRequest<typeof QuoteParamsSchema, typeof UpdateQuoteSchema>;
export type DeleteQuoteRequest = TypedParamsRequest<typeof QuoteParamsSchema>;

export const CreateQuoteSchema = z.object({
  jobId:                z.string().min(1),
  contractorId:         z.string().min(1),
  amount:               z.number().positive(),
  description:          z.string().optional(),
  status:               z.nativeEnum(QuoteStatus).default(QuoteStatus.DRAFT),
  sourceCommunicationId: z.string().optional(),
});

export const UpdateQuoteSchema = z.object({
  amount:      z.number().positive().optional(),
  description: z.string().optional(),
  status:      z.nativeEnum(QuoteStatus).optional(),
});
