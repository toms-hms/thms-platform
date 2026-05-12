import { createId } from '@paralleldrive/cuid2';
import { Factory } from 'fishery';
import { ContractorManager, ContractorWithRelations, attachZipCodes } from '@/contractor/models/ContractorManager';
import { TradeCategory } from '@thms/shared';

export const contractorFactory = Factory.define<ContractorWithRelations>(({ onCreate, sequence }) => {
  onCreate(async (contractor) => {
    const bare = await ContractorManager.create(
      {
        id:          contractor.id,
        name:        contractor.name,
        companyName: contractor.companyName,
        email:       contractor.email,
        phone:       contractor.phone,
        categories:  contractor.categories,
        notes:       contractor.notes,
        isGlobal:    contractor.isGlobal,
        createdAt:   contractor.createdAt,
        updatedAt:   contractor.updatedAt,
      },
      contractor.zipCodes,
    );
    const [withZips] = await attachZipCodes([bare]);
    return withZips;
  });

  return {
    id:          createId(),
    name:        `Test Contractor ${sequence}`,
    companyName: `Test Co ${sequence}`,
    email:       `contractor-${sequence}@example.com`,
    phone:       `512555${String(sequence).padStart(4, '0')}`,
    categories:  [TradeCategory.PLUMBING],
    zipCodes:    [],
    notes:       null,
    isGlobal:    true,
    createdAt:   new Date(),
    updatedAt:   new Date(),
  };
});
