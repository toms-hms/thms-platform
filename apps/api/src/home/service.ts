import { createId } from '@paralleldrive/cuid2';
import { ForbiddenError, NotFoundError } from '@/utils/errors';
import { HomeManager } from './models/HomeManager';
import { UserHomeManager } from './models/UserHomeManager';
import { UserManager } from '@/auth/models/UserManager';
import * as permissionService from '@/permissions/PermissionService';
import type { z } from 'zod';
import { CreateHomeSchema, UpdateHomeSchema } from './schema';

export function formatAddress(home: { address1: string; address2?: string | null; city: string; state: string; zipCode: string }) {
  const parts = [home.address1, home.address2].filter(Boolean);
  return `${parts.join(', ')}, ${home.city}, ${home.state} ${home.zipCode}`;
}

export async function createHome(userId: string, data: z.input<typeof CreateHomeSchema>) {
  const home = await HomeManager.create({
    id: createId(),
    name: data.name,
    address1: data.address1,
    address2: data.address2 ?? null,
    city: data.city,
    state: data.state,
    zipCode: data.zipCode,
    country: data.country ?? 'US',
    notes: data.notes ?? null,
    updatedAt: new Date(),
  });
  await UserHomeManager.create({ userId, homeId: home.id, role: 'OWNER' });
  permissionService.set(userId, home.id);
  return { ...home, fullAddress: formatAddress(home) };
}

export async function updateHome(homeId: string, data: z.infer<typeof UpdateHomeSchema>) {
  const updated = await HomeManager.update(homeId, { ...data, updatedAt: new Date() });
  return { ...updated, fullAddress: formatAddress(updated) };
}

export async function deleteHome(homeId: string, userId: string) {
  const membership = await UserHomeManager.findMembership(userId, homeId);
  if (membership?.role !== 'OWNER') throw new ForbiddenError('Only owners can delete homes');
  await HomeManager.delete(homeId);
  permissionService.invalidate(userId, homeId);
}

export async function addUserToHome(homeId: string, email: string, role: string) {
  const targetUser = await UserManager.findByEmail(email);
  if (!targetUser) throw new NotFoundError('User');
  const result = await UserHomeManager.upsert(targetUser.id, homeId, role as 'OWNER' | 'MEMBER');
  permissionService.set(targetUser.id, homeId);
  return result;
}

export async function removeUserFromHome(homeId: string, targetUserId: string) {
  await UserHomeManager.delete(targetUserId, homeId);
  permissionService.invalidate(targetUserId, homeId);
}
