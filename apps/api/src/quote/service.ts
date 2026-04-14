import { createId } from '@paralleldrive/cuid2';
import { NotFoundError } from '../utils/errors';
import { QuoteManager } from './models/QuoteManager';
import { UserHomeManager } from '../home/models/UserHomeManager';
import { JobManager } from '../job/models/JobManager';
import type { CreateQuoteInput, UpdateQuoteInput } from '@thms/shared';

export async function listQuotes(jobId: string, userId: string) {
  await JobManager.findByIdForUser(jobId, userId);
  return QuoteManager.listForJob(jobId);
}

export async function createQuote(jobId: string, userId: string, data: CreateQuoteInput) {
  await JobManager.findByIdForUser(jobId, userId);
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
