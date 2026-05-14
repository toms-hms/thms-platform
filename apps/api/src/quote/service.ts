import { createId } from '@paralleldrive/cuid2';
import { QuoteManager } from './models/QuoteManager';
import type { z } from 'zod';
import { CreateQuoteSchema, UpdateQuoteSchema } from './schema';

export async function createQuote(jobId: string, data: z.infer<typeof CreateQuoteSchema>) {
  return QuoteManager.create({
    id: createId(),
    jobId,
    contractorId: data.contractorId,
    amount: data.amount,
    description: data.description ?? null,
    status: data.status ?? 'DRAFT',
    sourceCommunicationId: data.sourceCommunicationId ?? null,
    updatedAt: new Date(),
  });
}

export async function updateQuote(quoteId: string, data: z.infer<typeof UpdateQuoteSchema>) {
  return QuoteManager.update(quoteId, data);
}

export async function deleteQuote(quoteId: string) {
  await QuoteManager.delete(quoteId);
}
