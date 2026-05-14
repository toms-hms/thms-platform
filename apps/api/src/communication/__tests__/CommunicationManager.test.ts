import { db } from '@/db';
import { users } from '@/auth/models/User';
import { homes } from '@/home/models/Home';
import { userHomes } from '@/home/models/UserHome';
import { jobs } from '@/job/models/Job';
import { communications } from '../models/Communication';
import { like, eq, inArray } from 'drizzle-orm';
import { userFactory } from '@/auth/factories/User.factory';
import { homeFactory } from '@/home/factories/Home.factory';
import { jobFactory } from '@/job/factories/Job.factory';
import { communicationFactory } from '../factories/Communication.factory';
import { CommunicationManager } from '../models/CommunicationManager';

const EMAIL_NS = 'test-comm-manager';

async function cleanup() {
  const testUsers = await db.select().from(users).where(like(users.email, `${EMAIL_NS}%`));
  for (const u of testUsers) {
    const uhs = await db.select().from(userHomes).where(eq(userHomes.userId, u.id));
    if (uhs.length) {
      const homeIds = uhs.map((uh) => uh.homeId);
      const testJobs = await db.select().from(jobs).where(inArray(jobs.homeId, homeIds));
      if (testJobs.length) await db.delete(communications).where(inArray(communications.jobId, testJobs.map((j) => j.id)));
      await db.delete(homes).where(inArray(homes.id, homeIds));
    }
  }
  await db.delete(users).where(like(users.email, `${EMAIL_NS}%`));
}

describe('CommunicationManager', () => {
  let userId: string;
  let otherUserId: string;
  let jobId: string;

  beforeAll(async () => {
    await cleanup();
    const user = await userFactory.create({ email: `${EMAIL_NS}@example.com` });
    const other = await userFactory.create({ email: `${EMAIL_NS}-other@example.com` });
    userId = user.id;
    otherUserId = other.id;
    const home = await homeFactory.create({}, { transient: { userId } });
    const job = await jobFactory.create({ homeId: home.id, createdByUserId: userId });
    jobId = job.id;
  });

  afterAll(cleanup);

  describe('hasPermission', () => {
    it('returns true for job owner', async () => {
      const comm = await communicationFactory.create({ jobId });
      expect(await CommunicationManager.hasPermission(userId, comm.id)).toBe(true);
    });

    it('returns false for non-owner', async () => {
      const comm = await communicationFactory.create({ jobId });
      expect(await CommunicationManager.hasPermission(otherUserId, comm.id)).toBe(false);
    });

    it('returns false for unknown id', async () => {
      expect(await CommunicationManager.hasPermission(userId, 'nonexistent-id')).toBe(false);
    });
  });

  describe('listForJob', () => {
    it('returns communications for the job', async () => {
      const comm = await communicationFactory.create({ jobId });
      const result = await CommunicationManager.listForJob(jobId);
      expect(result.some((r) => r.communication.id === comm.id)).toBe(true);
    });

    it('filters by needsReview', async () => {
      await communicationFactory.create({
        jobId,
        direction: 'RECEIVED',
        subject: 'Review',
        sentAt: null,
        receivedAt: new Date(),
        needsReview: true,
      });
      const result = await CommunicationManager.listForJob(jobId, { needsReview: true });
      expect(result.every((r) => r.communication.needsReview === true)).toBe(true);
    });
  });

  describe('create / update', () => {
    it('creates and updates a communication', async () => {
      const comm = await communicationFactory.create({ jobId });
      expect(comm.id).toBeDefined();

      const updated = await CommunicationManager.update(comm.id, { needsReview: true });
      expect(updated.needsReview).toBe(true);
    });
  });
});
