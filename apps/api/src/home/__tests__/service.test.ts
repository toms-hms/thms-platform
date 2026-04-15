import { db } from '../../db';
import { users } from '../../auth/models/User';
import { homes } from '../models/Home';
import { like } from 'drizzle-orm';
import { createUser } from '../../auth/factories/User.factory';
import { createHome } from '../factories/Home.factory';
import * as homeService from '../service';
import { PermissionService } from '../../permissions/PermissionService';

async function cleanup() {
  await db.delete(users).where(like(users.email, 'test-home-service%'));
}

describe('home/service', () => {
  let userId: string;
  let otherUserId: string;

  beforeAll(async () => {
    await cleanup();
    const user = await createUser({ email: 'test-home-service@example.com' });
    const other = await createUser({ email: 'test-home-service-other@example.com' });
    userId = user.id;
    otherUserId = other.id;
  });

  afterAll(async () => { await cleanup(); });

  describe('createHome', () => {
    it('creates the home and warms the permission cache', async () => {
      const home = await homeService.createHome(userId, {
        name: 'Service Test Home', address1: '1 St', city: 'Austin', state: 'TX', zipCode: '78701',
      });
      expect(home.id).toBeDefined();
      expect(home.fullAddress).toContain('Austin');
      // Cache should be warm — hasPermission should return true without a DB hit
      const spy = jest.spyOn(require('../models/UserHomeManager').UserHomeManager, 'findMembership');
      await PermissionService.check(require('../models/HomeManager').HomeManager, userId, home.id);
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('deleteHome', () => {
    it('invalidates the permission cache on delete', async () => {
      const home = await createHome(userId);
      // Warm cache first
      PermissionService.set(userId, home.id);
      await homeService.deleteHome(home.id, userId);
      // Cache should be cleared — next check goes to DB
      const spy = jest.spyOn(require('../models/UserHomeManager').UserHomeManager, 'findMembership');
      await PermissionService.check(require('../models/HomeManager').HomeManager, userId, home.id);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('throws if user is not the owner', async () => {
      const home = await createHome(userId);
      await expect(homeService.deleteHome(home.id, otherUserId)).rejects.toThrow();
    });
  });

  describe('addUserToHome', () => {
    it('warms the permission cache for the new member', async () => {
      const home = await createHome(userId);
      await homeService.addUserToHome(home.id, 'test-home-service-other@example.com', 'MEMBER');
      const spy = jest.spyOn(require('../models/UserHomeManager').UserHomeManager, 'findMembership');
      await PermissionService.check(require('../models/HomeManager').HomeManager, otherUserId, home.id);
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
