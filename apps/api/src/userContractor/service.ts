import { createId } from '@paralleldrive/cuid2';
import { NotFoundError, ConflictError } from '@/utils/errors';
import { ContractorManager } from '@/contractor/models/ContractorManager';
import { attachContractor, UserContractorManager } from './models/UserContractorManager';
import type { CreateUserContractorInput } from '@thms/shared';

/** Adds a contractor to the user's rolodex. Creates a private contractor first if no contractorId is given. */
export async function createUserContractor(userId: string, data: CreateUserContractorInput) {
  let contractorId = data.contractorId;

  if (!contractorId) {
    // Create a private (isGlobal: false) contractor for this user
    const newContractor = await ContractorManager.create(
      {
        id:          createId(),
        name:        data.name!,
        companyName: data.companyName ?? null,
        email:       data.email ?? null,
        phone:       data.phone ?? null,
        categories:  data.categories ?? [],
        notes:       data.notes ?? null,
        isGlobal:    false,
        updatedAt:   new Date(),
      },
      data.zipCodes ?? [],
    );
    contractorId = newContractor.id;
  } else {
    await ContractorManager.get({ id: contractorId });
  }

  const existing = await UserContractorManager.filterExisting(userId, contractorId);
  if (existing) throw new ConflictError('Contractor already in your rolodex');

  const row = await UserContractorManager.create({
    id:           createId(),
    userId,
    contractorId,
    note:         data.note ?? null,
    updatedAt:    new Date(),
  });

  const [withContractor] = await attachContractor([row]);
  return withContractor;
}

/** Removes a contractor from the user's rolodex, verifying ownership first. */
export async function deleteUserContractor(userId: string, userContractorId: string) {
  const row = await UserContractorManager.filterById(userContractorId);
  if (!row || row.userId !== userId) throw new NotFoundError('User contractor');
  await UserContractorManager.delete(userContractorId);
}
