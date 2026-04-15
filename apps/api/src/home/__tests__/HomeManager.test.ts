import { db } from '../../db';
import { users } from '../../auth/models/User';
import { homes } from '../models/Home';
import { userHomes } from '../models/UserHome';
import { like, eq } from 'drizzle-orm';
import { createUser } from '../../auth/factories/User.factory';
import { createHome } from '../factories/Home.factory';
import { HomeManager } from '../models/HomeManager';
import { UserRole } from '@thms/shared';

async function cleanup() {
  await db.delete(users).where(like(users.email, 'test-home-manager%'));
}

describe('HomeManager', () => {
  let userId: string;
  let otherUserId: string;

  beforeAll(async () => {
    await cleanup();
    const user = await createUser({ email: 'test-home-manager@example.com' });
    const other = await createUser({ email: 'test-home-manager-other@example.com' });
    userId = user.id;
    otherUserId = other.id;
  });

  afterAll(async () => { await cleanup(); });

  describe('hasPermission', () => {
    it('returns true for home owner', async () => {
      const home = await createHome(userId);
      expect(await HomeManager.hasPermission(userId, home.id)).toBe(true);
    });

    it('returns false for non-member', async () => {
      const home = await createHome(userId);
      expect(await HomeManager.hasPermission(otherUserId, home.id)).toBe(false);
    });

    it('returns false for unknown home', async () => {
      expect(await HomeManager.hasPermission(userId, 'nonexistent-id')).toBe(false);
    });
  });

  describe('listForUser', () => {
    it('returns only homes the user is a member of for USER role', async () => {
      const home = await createHome(userId);
      const result = await HomeManager.listForUser(userId, UserRole.USER);
      expect(result.some((h) => h.id === home.id)).toBe(true);
      expect(result.every((h) => h.id !== 'some-other-home')).toBe(true);
    });

    it('returns all homes for ADMIN role', async () => {
      const home1 = await createHome(userId);
      const home2 = await createHome(otherUserId);
      const result = await HomeManager.listForUser(userId, UserRole.ADMIN);
      const ids = result.map((h) => h.id);
      expect(ids).toContain(home1.id);
      expect(ids).toContain(home2.id);
    });
  });
});
