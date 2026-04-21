import { createId } from '@paralleldrive/cuid2';
import { Factory } from 'fishery';
import { HomeManager } from '@/home/models/HomeManager';
import { UserHomeManager } from '@/home/models/UserHomeManager';
import type { Home } from '@/home/models/Home';

export const homeFactory = Factory.define<Home, { userId: string }>(({ onCreate, transientParams, sequence }) => {
  onCreate(async (home) => {
    const created = await HomeManager.create(home);
    if (transientParams.userId) {
      await UserHomeManager.create({ userId: transientParams.userId, homeId: created.id, role: 'OWNER' });
    }
    return created;
  });

  return {
    id: createId(),
    name: `Test Home ${sequence}`,
    address1: `${sequence} Test Street`,
    address2: null,
    city: 'Austin',
    state: 'TX',
    zipCode: '78701',
    country: 'US',
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
});
