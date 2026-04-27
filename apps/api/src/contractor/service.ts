import { createId } from '@paralleldrive/cuid2';
import { NotFoundError } from '../utils/errors';
import { ContractorManager } from './models/ContractorManager';
import type { CreateContractorInput, UpdateContractorInput } from '@thms/shared';

export async function listContractors(filters?: { search?: string; category?: string }) {
  let results = await ContractorManager.findAll();

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    results = results.filter(
      (c) => c.name.toLowerCase().includes(s) || c.companyName?.toLowerCase().includes(s) || c.email?.toLowerCase().includes(s)
    );
  }
  if (filters?.category) {
    results = results.filter((c) => c.category === filters.category);
  }
  return results;
}

export async function createContractor(data: CreateContractorInput) {
  return ContractorManager.create({
    id: createId(),
    name: data.name,
    companyName: data.companyName ?? null,
    email: data.email ?? null,
    phone: data.phone ?? null,
    category: data.category,
    notes: data.notes ?? null,
    updatedAt: new Date(),
  });
}

export async function getContractor(contractorId: string) {
  const contractor = await ContractorManager.findById(contractorId);
  if (!contractor) throw new NotFoundError('Contractor');
  return contractor;
}

export async function updateContractor(contractorId: string, data: UpdateContractorInput) {
  await getContractor(contractorId);
  return ContractorManager.update(contractorId, data);
}

export async function deleteContractor(contractorId: string) {
  await getContractor(contractorId);
  await ContractorManager.delete(contractorId);
}
