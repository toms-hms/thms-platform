import { db } from '@/db';
import { users } from '@/auth/models/User';
import { homes } from '@/home/models/Home';
import { userHomes } from '@/home/models/UserHome';
import { like, eq, inArray } from 'drizzle-orm';
import { userFactory } from '@/auth/factories/User.factory';
import { homeFactory } from '@/home/factories/Home.factory';
import { jobFactory } from '@/job/factories/Job.factory';
import { JobManager } from '../models/JobManager';
import { UserRole, TradeCategory, JobStatus } from '@thms/shared';

const EMAIL_NS = 'test-job-manager';

async function cleanup() {
  const testUsers = await db.select().from(users).where(like(users.email, `${EMAIL_NS}%`));
  for (const u of testUsers) {
    const uhs = await db.select().from(userHomes).where(eq(userHomes.userId, u.id));
    if (uhs.length) await db.delete(homes).where(inArray(homes.id, uhs.map((uh) => uh.homeId)));
  }
  await db.delete(users).where(like(users.email, `${EMAIL_NS}%`));
}

describe('JobManager', () => {
  let userId: string;
  let otherUserId: string;
  let homeId: string;

  beforeAll(async () => {
    await cleanup();
    const user = await userFactory.create({ email: `${EMAIL_NS}@example.com` });
    const other = await userFactory.create({ email: `${EMAIL_NS}-other@example.com` });
    userId = user.id;
    otherUserId = other.id;
    const home = await homeFactory.create({}, { transient: { userId } });
    homeId = home.id;
  });

  afterAll(cleanup);

  describe('hasPermission', () => {
    it('returns true for home member', async () => {
      const job = await jobFactory.create({ homeId, createdByUserId: userId });
      expect(await JobManager.hasPermission(userId, job.id)).toBe(true);
    });

    it('returns false for non-member', async () => {
      const job = await jobFactory.create({ homeId, createdByUserId: userId });
      expect(await JobManager.hasPermission(otherUserId, job.id)).toBe(false);
    });

    it('returns false for unknown id', async () => {
      expect(await JobManager.hasPermission(userId, 'nonexistent-id')).toBe(false);
    });
  });

  describe('listForUser', () => {
    it('returns jobs for the home the user is a member of', async () => {
      const job = await jobFactory.create({ homeId, createdByUserId: userId });
      const result = await JobManager.listForUser(userId, UserRole.USER, homeId);
      expect(result.some((j) => j.id === job.id)).toBe(true);
    });

    it('filters by status', async () => {
      await jobFactory.create({ homeId, createdByUserId: userId, status: JobStatus.PLANNING });
      const result = await JobManager.listForUser(userId, UserRole.USER, homeId, { status: JobStatus.PLANNING });
      expect(result.every((j) => j.status === JobStatus.PLANNING)).toBe(true);
    });

    it('ADMIN can list jobs for any home', async () => {
      const job = await jobFactory.create({ homeId, createdByUserId: userId });
      const result = await JobManager.listForUser(otherUserId, UserRole.ADMIN, homeId);
      expect(result.some((j) => j.id === job.id)).toBe(true);
    });
  });

  describe('create / update / delete', () => {
    it('creates, updates, and deletes a job', async () => {
      const job = await jobFactory.create({ homeId, createdByUserId: userId });
      expect(job.id).toBeDefined();

      const updated = await JobManager.update(job.id, { title: 'Updated Title' });
      expect(updated.title).toBe('Updated Title');

      await JobManager.delete(job.id);
      expect(await JobManager.findById(job.id)).toBeUndefined();
    });
  });
});
