import { createId } from '@paralleldrive/cuid2';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { HomeManager } from './models/HomeManager';
import { UserHomeManager } from './models/UserHomeManager';
import { UserManager } from '../auth/models/UserManager';
import type { CreateHomeInput, UpdateHomeInput } from '@thms/shared';

export function formatAddress(home: { address1: string; address2?: string | null; city: string; state: string; zipCode: string }) {
  const parts = [home.address1, home.address2].filter(Boolean);
  return `${parts.join(', ')}, ${home.city}, ${home.state} ${home.zipCode}`;
}

export async function listHomes(userId: string) {
  const results = await UserHomeManager.listHomesForUser(userId);
  return results.map(({ home, role }) => ({ ...home, fullAddress: formatAddress(home), role }));
}

export async function createHome(userId: string, data: CreateHomeInput) {
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
  return { ...home, fullAddress: formatAddress(home) };
}

export async function getHome(homeId: string, userId: string) {
  const membership = await UserHomeManager.assertMembership(userId, homeId);
  const home = await HomeManager.findById(homeId);
  if (!home) throw new NotFoundError('Home');
  return { ...home, fullAddress: formatAddress(home), role: membership.role };
}

export async function updateHome(homeId: string, userId: string, data: UpdateHomeInput) {
  await UserHomeManager.assertMembership(userId, homeId);
  const updated = await HomeManager.update(homeId, { ...data, updatedAt: new Date() });
  return { ...updated, fullAddress: formatAddress(updated) };
}

export async function deleteHome(homeId: string, userId: string) {
  const membership = await UserHomeManager.assertMembership(userId, homeId);
  if (membership.role !== 'OWNER') throw new ForbiddenError('Only owners can delete homes');
  await HomeManager.delete(homeId);
}

export async function addUserToHome(homeId: string, requesterId: string, email: string, role: string) {
  await UserHomeManager.assertMembership(requesterId, homeId);
  const targetUser = await UserManager.findByEmail(email);
  if (!targetUser) throw new NotFoundError('User');
  return UserHomeManager.upsert(targetUser.id, homeId, role as 'OWNER' | 'MEMBER');
}

export async function removeUserFromHome(homeId: string, requesterId: string, targetUserId: string) {
  await UserHomeManager.assertMembership(requesterId, homeId);
  await UserHomeManager.delete(targetUserId, homeId);
}
