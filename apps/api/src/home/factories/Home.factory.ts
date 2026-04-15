import { createId } from '@paralleldrive/cuid2';
import { HomeManager } from '../models/HomeManager';
import { UserHomeManager } from '../models/UserHomeManager';
import type { Home } from '../models/Home';

export async function createHome(userId: string, overrides?: Partial<{ name: string; address1: string; city: string; state: string; zipCode: string }>): Promise<Home> {
  const home = await HomeManager.create({
    id: createId(),
    name: overrides?.name ?? 'Test Home',
    address1: overrides?.address1 ?? '123 Test St',
    address2: null,
    city: overrides?.city ?? 'Austin',
    state: overrides?.state ?? 'TX',
    zipCode: overrides?.zipCode ?? '78701',
    country: 'US',
    notes: null,
    updatedAt: new Date(),
  });
  await UserHomeManager.create({ userId, homeId: home.id, role: 'OWNER' });
  return home;
}
