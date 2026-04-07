import { prisma } from '../config/prisma';
import { NotFoundError } from '../utils/errors';
import type { CreateContractorInput, UpdateContractorInput } from '@thms/shared';

export async function listContractors(
  userId: string,
  filters?: { search?: string; category?: string }
) {
  const userContractors = await prisma.userContractor.findMany({
    where: { userId },
    include: {
      contractor: true,
    },
  });

  let contractors = userContractors.map((uc) => uc.contractor);

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    contractors = contractors.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        c.companyName?.toLowerCase().includes(s) ||
        c.email?.toLowerCase().includes(s)
    );
  }

  if (filters?.category) {
    contractors = contractors.filter((c) =>
      c.category.toLowerCase().includes(filters.category!.toLowerCase())
    );
  }

  return contractors;
}

export async function createContractor(userId: string, data: CreateContractorInput) {
  const contractor = await prisma.contractor.create({
    data: {
      name: data.name,
      companyName: data.companyName,
      email: data.email,
      phone: data.phone,
      category: data.category,
      notes: data.notes,
      users: {
        create: { userId },
      },
    },
  });

  return contractor;
}

export async function getContractor(contractorId: string, userId: string) {
  const userContractor = await prisma.userContractor.findUnique({
    where: { userId_contractorId: { userId, contractorId } },
    include: { contractor: true },
  });

  if (!userContractor) throw new NotFoundError('Contractor');
  return userContractor.contractor;
}

export async function updateContractor(
  contractorId: string,
  userId: string,
  data: UpdateContractorInput
) {
  await getContractor(contractorId, userId);

  return prisma.contractor.update({
    where: { id: contractorId },
    data,
  });
}

export async function deleteContractor(contractorId: string, userId: string) {
  await getContractor(contractorId, userId);
  await prisma.contractor.delete({ where: { id: contractorId } });
}
