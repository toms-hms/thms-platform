import { createId } from '@paralleldrive/cuid2';
import { Factory } from 'fishery';
import { ContractorManager } from '@/contractor/models/ContractorManager';
import { TradeCategory } from '@thms/shared';
import type { Contractor } from '@/contractor/models/Contractor';

export const contractorFactory = Factory.define<Contractor>(({ onCreate, sequence }) => {
  onCreate((contractor) => ContractorManager.create(contractor));

  return {
    id: createId(),
    name: `Test Contractor ${sequence}`,
    companyName: `Test Co ${sequence}`,
    email: `contractor-${sequence}@example.com`,
    phone: `512555${String(sequence).padStart(4, '0')}`,
    category: TradeCategory.PLUMBING,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
});
