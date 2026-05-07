import { createId } from '@paralleldrive/cuid2';
import { Factory } from 'fishery';
import { UserContractorManager, type UserContractorWithContractor } from '@/userContractor/models/UserContractorManager';

export const userContractorFactory = Factory.define<UserContractorWithContractor>(({ onCreate, sequence }) => {
  onCreate((uc) =>
    UserContractorManager.create({
      id:           uc.id,
      userId:       uc.userId,
      contractorId: uc.contractorId,
      note:         uc.note,
      createdAt:    uc.createdAt,
      updatedAt:    uc.updatedAt,
    }).then(async (row) => {
      const { attachContractor } = await import('../models/UserContractorManager');
      const [withContractor] = await attachContractor([row]);
      return withContractor;
    })
  );

  return {
    id:           createId(),
    userId:       createId(),
    contractorId: createId(),
    note:         null,
    createdAt:    new Date(),
    updatedAt:    new Date(),
    contractor:   null as any, // populated by onCreate
  };
});
