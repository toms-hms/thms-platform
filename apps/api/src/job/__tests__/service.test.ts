import { db } from '@/db';
import { users } from '@/auth/models/User';
import { homes } from '@/home/models/Home';
import { userHomes } from '@/home/models/UserHome';
import { like, eq, inArray } from 'drizzle-orm';
import { userFactory } from '@/auth/factories/User.factory';
import { homeFactory } from '@/home/factories/Home.factory';
import * as jobService from '../service';
import { JobManager } from '../models/JobManager';
import { TradeCategory, JobIntent, JobStatus } from '@thms/shared';

const EMAIL_NS = 'test-job-service';

async function cleanup() {
  const testUsers = await db.select().from(users).where(like(users.email, `${EMAIL_NS}%`));
  for (const u of testUsers) {
    const uhs = await db.select().from(userHomes).where(eq(userHomes.userId, u.id));
    if (uhs.length) await db.delete(homes).where(inArray(homes.id, uhs.map((uh) => uh.homeId)));
  }
  await db.delete(users).where(like(users.email, `${EMAIL_NS}%`));
}

describe('job/service', () => {
  let userId: string;
  let homeId: string;

  beforeAll(async () => {
    await cleanup();
    const user = await userFactory.create({ email: `${EMAIL_NS}@example.com` });
    userId = user.id;
    const home = await homeFactory.create({}, { transient: { userId } });
    homeId = home.id;
  });

  afterAll(cleanup);

  describe('createJob', () => {
    it('creates a job with default aiSession', async () => {
      const job = await jobService.createJob(homeId, userId, {
        title: 'Leaking pipe',
        intent: JobIntent.ISSUE,
        category: TradeCategory.PLUMBING,
        status: JobStatus.DRAFT,
      });
      expect(job.id).toBeDefined();
      expect(job.homeId).toBe(homeId);
      expect(job.createdByUserId).toBe(userId);
      expect(job.title).toBe('Leaking pipe');
    });

    it('seeds confirmedCategories from categories array', async () => {
      const job = await jobService.createJob(homeId, userId, {
        title: 'Bathroom remodel',
        intent: JobIntent.IMPROVEMENT,
        category: TradeCategory.GENERAL_CONTRACTING,
        categories: [TradeCategory.GENERAL_CONTRACTING, TradeCategory.PLUMBING],
        status: JobStatus.DRAFT,
      });
      expect((job.aiSession as any).confirmedCategories).toEqual([
        TradeCategory.GENERAL_CONTRACTING,
        TradeCategory.PLUMBING,
      ]);
    });
  });

  describe('updateJob', () => {
    it('updates job fields', async () => {
      const job = await jobService.createJob(homeId, userId, {
        title: 'Old title',
        intent: JobIntent.ISSUE,
        category: TradeCategory.ELECTRICAL,
        status: JobStatus.DRAFT,
      });
      const updated = await jobService.updateJob(job.id, { title: 'New title', status: JobStatus.PLANNING });
      expect(updated.title).toBe('New title');
      expect(updated.status).toBe(JobStatus.PLANNING);
    });
  });

  describe('deleteJob', () => {
    it('deletes the job', async () => {
      const job = await jobService.createJob(homeId, userId, {
        title: 'To Delete',
        intent: JobIntent.ISSUE,
        category: TradeCategory.PLUMBING,
        status: JobStatus.DRAFT,
      });
      await jobService.deleteJob(job.id);
      const found = await JobManager.findById(job.id);
      expect(found).toBeUndefined();
    });
  });
});
