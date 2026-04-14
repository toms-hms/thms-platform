import { createId } from '@paralleldrive/cuid2';
import { NotFoundError } from '../utils/errors';
import { ContractorManager } from './models/ContractorManager';
import { UserContractorManager } from './models/UserContractorManager';
import type { CreateContractorInput, UpdateContractorInput } from '@thms/shared';

export async function listContractors(userId: string, filters?: { search?: string; category?: string }) {
  const results = await UserContractorManager.listContractorsForUser(userId);
  let contractors = results.map((r) => r.contractor);

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    contractors = contractors.filter(
      (c) => c.name.toLowerCase().includes(s) || c.companyName?.toLowerCase().includes(s) || c.email?.toLowerCase().includes(s)
    );
  }
  if (filters?.category) {
    contractors = contractors.filter((c) => c.category.toLowerCase().includes(filters.category!.toLowerCase()));
  }
  return contractors;
}

export async function createContractor(userId: string, data: CreateContractorInput) {
  const contractor = await ContractorManager.create({
    id: createId(),
    name: data.name,
    companyName: data.companyName ?? null,
    email: data.email ?? null,
    phone: data.phone ?? null,
    category: data.category,
    notes: data.notes ?? null,
    updatedAt: new Date(),
  });
  await UserContractorManager.create({ userId, contractorId: contractor.id });
  return contractor;
}

export async function getContractor(contractorId: string, userId: string) {
  await UserContractorManager.assertMembership(userId, contractorId);
  const contractor = await ContractorManager.findById(contractorId);
  if (!contractor) throw new NotFoundError('Contractor');
  return contractor;
}

export async function updateContractor(contractorId: string, userId: string, data: UpdateContractorInput) {
  await getContractor(contractorId, userId);
  return ContractorManager.update(contractorId, data);
}

export async function deleteContractor(contractorId: string, userId: string) {
  await getContractor(contractorId, userId);
  await ContractorManager.delete(contractorId);
}
