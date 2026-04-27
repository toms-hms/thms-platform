import { createId } from '@paralleldrive/cuid2';
import { Factory } from 'fishery';
import { QuoteManager } from '@/quote/models/QuoteManager';
import type { Quote } from '@/quote/models/Quote';

export const quoteFactory = Factory.define<Quote, { jobId: string; contractorId: string }>(({ onCreate, transientParams, sequence }) => {
  onCreate((quote) => QuoteManager.create(quote));

  return {
    id: createId(),
    jobId: transientParams.jobId ?? '',
    contractorId: transientParams.contractorId ?? '',
    amount: 1000 * sequence,
    description: null,
    status: 'DRAFT',
    sourceCommunicationId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
});
