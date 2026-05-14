import { db } from '@/db';
import { users } from '@/auth/models/User';
import { homes } from '@/home/models/Home';
import { userHomes } from '@/home/models/UserHome';
import { like, eq, inArray } from 'drizzle-orm';
import { userFactory } from '@/auth/factories/User.factory';
import { homeFactory } from '@/home/factories/Home.factory';
import { jobFactory } from '@/job/factories/Job.factory';
import { confirmUpload } from '../service';
import { JobImageManager } from '@/ai/models/JobImageManager';

const EMAIL_NS = 'test-upload-service';

async function cleanup() {
  const testUsers = await db.select().from(users).where(like(users.email, `${EMAIL_NS}%`));
  for (const u of testUsers) {
    const uhs = await db.select().from(userHomes).where(eq(userHomes.userId, u.id));
    if (uhs.length) await db.delete(homes).where(inArray(homes.id, uhs.map((uh) => uh.homeId)));
  }
  await db.delete(users).where(like(users.email, `${EMAIL_NS}%`));
}

describe('upload/service', () => {
  let userId: string;
  let jobId: string;

  beforeAll(async () => {
    await cleanup();
    const user = await userFactory.create({ email: `${EMAIL_NS}@example.com` });
    userId = user.id;
    const home = await homeFactory.create({}, { transient: { userId } });
    const job = await jobFactory.create({ homeId: home.id, createdByUserId: userId });
    jobId = job.id;
  });

  afterAll(cleanup);

  describe('confirmUpload', () => {
    it('creates a job image record', async () => {
      const image = await confirmUpload({
        jobId,
        userId,
        key: `jobs/${jobId}/source/test-image.jpg`,
        kind: 'SOURCE',
        label: 'Before photo',
      });
      expect(image.id).toBeDefined();
      expect(image.jobId).toBe(jobId);
      expect(image.kind).toBe('SOURCE');

      // Cleanup
      await JobImageManager.delete(image.id);
    });
  });
});
