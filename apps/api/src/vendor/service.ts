import { createId } from '@paralleldrive/cuid2';
import { NotFoundError } from '../utils/errors';
import { VendorManager } from './models/VendorManager';
import type { CreateVendorInput, UpdateVendorInput } from '@thms/shared';

export async function listVendors(filters?: { search?: string; category?: string }) {
  let results = await VendorManager.findAll();

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    results = results.filter(
      (v) =>
        v.name.toLowerCase().includes(s) ||
        v.companyName?.toLowerCase().includes(s) ||
        v.email?.toLowerCase().includes(s),
    );
  }
  if (filters?.category) {
    results = results.filter((v) => v.categories.includes(filters.category as any));
  }
  return results;
}

export async function createVendor(data: CreateVendorInput) {
  return VendorManager.create(
    {
      id:          createId(),
      name:        data.name,
      companyName: data.companyName ?? null,
      email:       data.email ?? null,
      phone:       data.phone ?? null,
      notes:       data.notes ?? null,
      updatedAt:   new Date(),
    },
    data.categories,
    data.zipCodes ?? [],
  );
}

export async function getVendor(vendorId: string) {
  const vendor = await VendorManager.findById(vendorId);
  if (!vendor) throw new NotFoundError('Vendor');
  return vendor;
}

export async function updateVendor(vendorId: string, data: UpdateVendorInput) {
  await getVendor(vendorId);
  const { categories, zipCodes, ...rest } = data;
  return VendorManager.update(vendorId, rest, categories, zipCodes);
}

export async function deleteVendor(vendorId: string) {
  await getVendor(vendorId);
  await VendorManager.delete(vendorId);
}
