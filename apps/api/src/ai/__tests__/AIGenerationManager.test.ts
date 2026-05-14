import { db } from '@/db';
import { users } from '@/auth/models/User';
import { homes } from '@/home/models/Home';
import { userHomes } from '@/home/models/UserHome';
import { like, eq, inArray } from 'drizzle-orm';
import { userFactory } from '@/auth/factories/User.factory';
import { homeFactory } from '@/home/factories/Home.factory';
import { jobFactory } from '@/job/factories/Job.factory';
import { aiGenerationFactory } from '../factories/AIGeneration.factory';
import { AIGenerationManager } from '../models/AIGenerationManager';

const EMAIL_NS = 'test-ai-gen-manager';

async function cleanup() {
  const testUsers = await db.select().from(users).where(like(users.email, `${EMAIL_NS}%`));
  for (const u of testUsers) {
    const uhs = await db.select().from(userHomes).where(eq(userHomes.userId, u.id));
    if (uhs.length) await db.delete(homes).where(inArray(homes.id, uhs.map((uh) => uh.homeId)));
  }
  await db.delete(users).where(like(users.email, `${EMAIL_NS}%`));
}

describe('AIGenerationManager', () => {
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

  describe('create / update / listForJob', () => {
    it('creates, updates, and lists AI generations', async () => {
      const gen = await aiGenerationFactory.create({
        jobId,
        createdByUserId: userId,
      });
      expect(gen.id).toBeDefined();
      expect(gen.status).toBe('PENDING');

      const updated = await AIGenerationManager.update(gen.id, { status: 'COMPLETED', generatedImageUrl: 'https://example.com/img.png' });
      expect(updated.status).toBe('COMPLETED');
      expect(updated.generatedImageUrl).toBe('https://example.com/img.png');

      const list = await AIGenerationManager.listForJob(jobId);
      expect(list.some((g) => g.id === gen.id)).toBe(true);
    });
  });
});
