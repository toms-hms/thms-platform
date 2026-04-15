import { createId } from '@paralleldrive/cuid2';
import { QuoteManager } from '../models/QuoteManager';
import type { Quote } from '../models/Quote';

export async function createQuote(jobId: string, contractorId: string, overrides?: Partial<{ amount: number }>): Promise<Quote> {
  return QuoteManager.create({
    id: createId(),
    jobId,
    contractorId,
    amount: overrides?.amount ?? 5000,
    description: null,
    status: 'DRAFT',
    sourceCommunicationId: null,
    updatedAt: new Date(),
  });
}
