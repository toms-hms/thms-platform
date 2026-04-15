import { db } from '../../db';
import { users } from '../../auth/models/User';
import { like } from 'drizzle-orm';
import { createUser } from '../../auth/factories/User.factory';
import { createHome } from '../../home/factories/Home.factory';
import { HomeManager } from '../../home/models/HomeManager';
import { PermissionService } from '../PermissionService';
import { UserRole } from '@thms/shared';

async function cleanup() {
  await db.delete(users).where(like(users.email, 'test-permsvc%'));
}

describe('PermissionService', () => {
  let userId: string;
  let otherUserId: string;

  beforeAll(async () => {
    await cleanup();
    const user = await createUser({ email: 'test-permsvc@example.com' });
    const other = await createUser({ email: 'test-permsvc-other@example.com' });
    userId = user.id;
    otherUserId = other.id;
  });

  afterAll(async () => { await cleanup(); });

  describe('check', () => {
    it('returns true for member and caches the result', async () => {
      const home = await createHome(userId);
      // First call — hits DB
      const result = await PermissionService.check(HomeManager, userId, home.id);
      expect(result).toBe(true);
      // Second call — should hit cache, not DB
      const spy = jest.spyOn(HomeManager, 'hasPermission');
      await PermissionService.check(HomeManager, userId, home.id);
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('returns false for non-member and does not cache', async () => {
      const home = await createHome(userId);
      const result = await PermissionService.check(HomeManager, otherUserId, home.id);
      expect(result).toBe(false);
      // False result not cached — next check goes to DB again
      const spy = jest.spyOn(HomeManager, 'hasPermission');
      await PermissionService.check(HomeManager, otherUserId, home.id);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('list', () => {
    it('returns scoped list and warms cache', async () => {
      const home = await createHome(userId);
      const results = await PermissionService.list(HomeManager, userId, UserRole.USER);
      const ids = results.map((h: any) => h.id);
      expect(ids).toContain(home.id);
      // Cache should be warm — no DB hit on subsequent check
      const spy = jest.spyOn(HomeManager, 'hasPermission');
      await PermissionService.check(HomeManager, userId, home.id);
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('set / invalidate', () => {
    it('set warms the cache', async () => {
      const home = await createHome(userId);
      PermissionService.set(userId, home.id);
      const spy = jest.spyOn(HomeManager, 'hasPermission');
      await PermissionService.check(HomeManager, userId, home.id);
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('invalidate clears the cache', async () => {
      const home = await createHome(userId);
      PermissionService.set(userId, home.id);
      PermissionService.invalidate(userId, home.id);
      const spy = jest.spyOn(HomeManager, 'hasPermission');
      await PermissionService.check(HomeManager, userId, home.id);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
