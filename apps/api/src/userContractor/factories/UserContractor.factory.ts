import { createId } from '@paralleldrive/cuid2';
import { Factory } from 'fishery';
import { userFactory } from '@/auth/factories/User.factory';
import { contractorFactory } from '@/contractor/factories/Contractor.factory';
import {
  attachContractor,
  UserContractorManager,
  type UserContractorWithContractor,
} from '@/userContractor/models/UserContractorManager';

export const userContractorFactory = Factory.define<UserContractorWithContractor>(({ onCreate, params }) => {
  onCreate(async (uc) => {
    const userId = params.userId ?? (await userFactory.create()).id;
    const contractorId = params.contractorId ?? (await contractorFactory.create()).id;

    const row = await UserContractorManager.create({
      id:           uc.id,
      userId,
      contractorId,
      note:         uc.note,
      createdAt:    uc.createdAt,
      updatedAt:    uc.updatedAt,
    });
    const [withContractor] = await attachContractor([row]);
    return withContractor;
  });

  return {
    id:           createId(),
    userId:       params.userId ?? createId(),
    contractorId: params.contractorId ?? createId(),
    note:         params.note ?? null,
    createdAt:    new Date(),
    updatedAt:    new Date(),
    contractor:   (params.contractor as UserContractorWithContractor['contractor'] | undefined)
      ?? contractorFactory.build(),
  };
});
