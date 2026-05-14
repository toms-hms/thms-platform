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
import * as communicationService from '../service';
import { CommunicationManager } from '../models/CommunicationManager';
import { createId } from '@paralleldrive/cuid2';

const EMAIL_NS = 'test-comm-service';

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

async function createComm(jobId: string) {
  return CommunicationManager.create({
    id: createId(),
    jobId,
    contractorId: null,
    channel: 'EMAIL',
    direction: 'SENT',
    subject: 'Test',
    bodyText: 'Body',
    bodyHtml: null,
    externalThreadId: null,
    externalMessageId: null,
    sentAt: new Date(),
    receivedAt: null,
    parsedSummary: null,
    needsReview: false,
    updatedAt: new Date(),
  });
}

describe('communication/service', () => {
  let jobId: string;

  beforeAll(async () => {
    await cleanup();
    const user = await userFactory.create({ email: `${EMAIL_NS}@example.com` });
    const home = await homeFactory.create({}, { transient: { userId: user.id } });
    const job = await jobFactory.create({ homeId: home.id, createdByUserId: user.id });
    jobId = job.id;
  });

  afterAll(cleanup);

  describe('updateCommunication', () => {
    it('updates needsReview', async () => {
      const comm = await createComm(jobId);
      const updated = await communicationService.updateCommunication(comm.id, { needsReview: true });
      expect(updated.needsReview).toBe(true);
    });

    it('updates parsedSummary', async () => {
      const comm = await createComm(jobId);
      const updated = await communicationService.updateCommunication(comm.id, { parsedSummary: 'Summary text' });
      expect(updated.parsedSummary).toBe('Summary text');
    });
  });
});
