import { createId } from '@paralleldrive/cuid2';
import { Factory } from 'fishery';
import { contractorFactory } from '@/contractor/factories/Contractor.factory';
import { jobFactory } from '@/job/factories/Job.factory';
import { QuoteManager } from '@/quote/models/QuoteManager';
import { QuoteStatus } from '@thms/shared';
import type { Quote } from '@/quote/models/Quote';

export const quoteFactory = Factory.define<Quote>(({ onCreate, params, sequence }) => {
  onCreate(async (quote) => {
    const jobId = params.jobId ?? (await jobFactory.create()).id;
    const contractorId = params.contractorId ?? (await contractorFactory.create()).id;

    return QuoteManager.create({
      ...quote,
      jobId,
      contractorId,
    });
  });

  return {
    id: createId(),
    jobId: params.jobId ?? createId(),
    contractorId: params.contractorId ?? createId(),
    amount: params.amount ?? 1000 * sequence,
    description: params.description ?? null,
    status: params.status ?? QuoteStatus.DRAFT,
    sourceCommunicationId: params.sourceCommunicationId ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
});
