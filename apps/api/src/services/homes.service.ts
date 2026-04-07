import { prisma } from '../config/prisma';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import type { CreateHomeInput, UpdateHomeInput } from '@thms/shared';

function formatAddress(home: {
  address1: string;
  address2?: string | null;
  city: string;
  state: string;
  zipCode: string;
}) {
  const parts = [home.address1, home.address2].filter(Boolean);
  return `${parts.join(', ')}, ${home.city}, ${home.state} ${home.zipCode}`;
}

export async function listHomes(userId: string) {
  const userHomes = await prisma.userHome.findMany({
    where: { userId },
    include: { home: true },
    orderBy: { home: { createdAt: 'desc' } },
  });

  return userHomes.map(({ home, role }) => ({
    ...home,
    fullAddress: formatAddress(home),
    role,
  }));
}

export async function createHome(userId: string, data: CreateHomeInput) {
  const home = await prisma.home.create({
    data: {
      name: data.name,
      address1: data.address1,
      address2: data.address2,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      country: data.country || 'US',
      notes: data.notes,
      users: {
        create: { userId, role: 'OWNER' },
      },
    },
  });

  return { ...home, fullAddress: formatAddress(home) };
}

export async function getHome(homeId: string, userId: string) {
  const userHome = await prisma.userHome.findUnique({
    where: { userId_homeId: { userId, homeId } },
    include: { home: true },
  });

  if (!userHome) throw new NotFoundError('Home');

  return { ...userHome.home, fullAddress: formatAddress(userHome.home), role: userHome.role };
}

export async function updateHome(homeId: string, userId: string, data: UpdateHomeInput) {
  await getHome(homeId, userId);

  const updated = await prisma.home.update({
    where: { id: homeId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.address1 && { address1: data.address1 }),
      ...(data.address2 !== undefined && { address2: data.address2 }),
      ...(data.city && { city: data.city }),
      ...(data.state && { state: data.state }),
      ...(data.zipCode && { zipCode: data.zipCode }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });

  return { ...updated, fullAddress: formatAddress(updated) };
}

export async function deleteHome(homeId: string, userId: string) {
  const userHome = await prisma.userHome.findUnique({
    where: { userId_homeId: { userId, homeId } },
  });

  if (!userHome) throw new NotFoundError('Home');
  if (userHome.role !== 'OWNER') throw new ForbiddenError('Only owners can delete homes');

  await prisma.home.delete({ where: { id: homeId } });
}

export async function addUserToHome(
  homeId: string,
  requesterId: string,
  email: string,
  role: string
) {
  await getHome(homeId, requesterId);

  const targetUser = await prisma.user.findUnique({ where: { email } });
  if (!targetUser) throw new NotFoundError('User');

  const existing = await prisma.userHome.findUnique({
    where: { userId_homeId: { userId: targetUser.id, homeId } },
  });

  if (existing) {
    return prisma.userHome.update({
      where: { userId_homeId: { userId: targetUser.id, homeId } },
      data: { role: role as 'OWNER' | 'MEMBER' },
    });
  }

  return prisma.userHome.create({
    data: { userId: targetUser.id, homeId, role: role as 'OWNER' | 'MEMBER' },
  });
}

export async function removeUserFromHome(homeId: string, requesterId: string, targetUserId: string) {
  await getHome(homeId, requesterId);

  await prisma.userHome.delete({
    where: { userId_homeId: { userId: targetUserId, homeId } },
  });
}
