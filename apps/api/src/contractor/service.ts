import { createId } from '@paralleldrive/cuid2';
import { NotFoundError } from '../utils/errors';
import { ContractorManager } from './models/ContractorManager';
import type { CreateContractorInput, UpdateContractorInput } from '@thms/shared';

export async function createContractor(data: CreateContractorInput) {
  return ContractorManager.create(
    {
      id:          createId(),
      name:        data.name,
      companyName: data.companyName ?? null,
      email:       data.email ?? null,
      phone:       data.phone ?? null,
      categories:  data.categories,
      notes:       data.notes ?? null,
      updatedAt:   new Date(),
    },
    data.zipCodes ?? [],
  );
}

export async function getContractor(contractorId: string) {
  const contractor = await ContractorManager.findById(contractorId);
  if (!contractor) throw new NotFoundError('Contractor');
  return contractor;
}

export async function updateContractor(contractorId: string, data: UpdateContractorInput) {
  await getContractor(contractorId);
  const { zipCodes, ...rest } = data;
  return ContractorManager.update(contractorId, rest, zipCodes);
}

export async function deleteContractor(contractorId: string) {
  await getContractor(contractorId);
  await ContractorManager.delete(contractorId);
}
