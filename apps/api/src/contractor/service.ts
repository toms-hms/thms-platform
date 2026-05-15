import { createId } from '@paralleldrive/cuid2';
import { attachZipCodes, ContractorManager } from './models/ContractorManager';
import type { z } from 'zod';
import { CreateContractorSchema } from './schema';

/** Creates a global contractor (isGlobal: true). Admin only. Returns contractor with zip codes attached. */
export async function createContractor(data: z.infer<typeof CreateContractorSchema>) {
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
export async function updateContractor(contractorId: string, data: Partial<z.infer<typeof CreateContractorSchema>>) {
  await ContractorManager.get({ id: contractorId });
  const { zipCodes, ...rest } = data;
  const updated = await ContractorManager.update(contractorId, rest, zipCodes);
  const [withZips] = await attachZipCodes([updated]);
  return withZips;
}

/** Promotes a contractor to isGlobal: true. Admin only. */
export async function promoteContractor(contractorId: string) {
  await ContractorManager.get({ id: contractorId });
  const promoted = await ContractorManager.promote(contractorId);
  const [withZips] = await attachZipCodes([promoted]);
  return withZips;
}

/** Deletes the contractor, throwing NotFoundError if not found. */
export async function deleteContractor(contractorId: string) {
  await ContractorManager.get({ id: contractorId });
  await ContractorManager.delete(contractorId);
}
