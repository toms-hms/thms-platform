import { z } from 'zod';
import { QuoteStatus } from '@thms/shared';

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
