import { createId } from '@paralleldrive/cuid2';
import { NotFoundError } from '@/utils/errors';
import { attachZipCodes, ContractorManager } from './models/ContractorManager';
import type { CreateContractorInput } from '@thms/shared';

/** Creates a global contractor (isGlobal: true). Admin only. Returns contractor with zip codes attached. */
export async function createContractor(data: CreateContractorInput) {
  const contractor = await ContractorManager.create(
    {
      id:          createId(),
      name:        data.name,
      companyName: data.companyName ?? null,
      email:       data.email ?? null,
      phone:       data.phone ?? null,
      categories:  data.categories,
      notes:       data.notes ?? null,
      isGlobal:    true,
      updatedAt:   new Date(),
    },
    data.zipCodes ?? [],
  );
  const [withZips] = await attachZipCodes([contractor]);
  return withZips;
}

/** Updates the contractor's fields and zip codes. Returns the updated record with zip codes attached. */
export async function updateContractor(contractorId: string, data: Partial<CreateContractorInput>) {
  const existing = await ContractorManager.filterById(contractorId);
  if (!existing) throw new NotFoundError('Contractor');
  const { zipCodes, ...rest } = data as any;
  const updated = await ContractorManager.update(contractorId, rest, zipCodes);
  const [withZips] = await attachZipCodes([updated]);
  return withZips;
}

/** Promotes a contractor to isGlobal: true. Admin only. */
export async function promoteContractor(contractorId: string) {
  const existing = await ContractorManager.filterById(contractorId);
  if (!existing) throw new NotFoundError('Contractor');
  const promoted = await ContractorManager.promote(contractorId);
  const [withZips] = await attachZipCodes([promoted]);
  return withZips;
}

/** Deletes the contractor, throwing NotFoundError if not found. */
export async function deleteContractor(contractorId: string) {
  const existing = await ContractorManager.filterById(contractorId);
  if (!existing) throw new NotFoundError('Contractor');
  await ContractorManager.delete(contractorId);
}
