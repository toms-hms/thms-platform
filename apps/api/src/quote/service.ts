import { createId } from '@paralleldrive/cuid2';
import { QuoteManager } from './models/QuoteManager';
import type { CreateQuoteInput, UpdateQuoteInput } from '@thms/shared';

export async function listQuotes(jobId: string) {
  return QuoteManager.listForJob(jobId);
}

export async function createQuote(jobId: string, data: CreateQuoteInput) {
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

export async function updateQuote(quoteId: string, data: UpdateQuoteInput) {
  return QuoteManager.update(quoteId, data);
}

export async function deleteQuote(quoteId: string) {
  await QuoteManager.delete(quoteId);
}
