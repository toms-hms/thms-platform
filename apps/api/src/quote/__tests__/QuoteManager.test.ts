import { db } from '@/db';
import { users } from '@/auth/models/User';
import { homes } from '@/home/models/Home';
import { userHomes } from '@/home/models/UserHome';
import { like, eq, inArray } from 'drizzle-orm';
import { userFactory } from '@/auth/factories/User.factory';
import { homeFactory } from '@/home/factories/Home.factory';
import { jobFactory } from '@/job/factories/Job.factory';
import { contractorFactory } from '@/contractor/factories/Contractor.factory';
import { quoteFactory } from '../factories/Quote.factory';
import { QuoteManager } from '../models/QuoteManager';
import { UserRole, QuoteStatus } from '@thms/shared';

const EMAIL_NS = 'test-quote-manager';

async function cleanup() {
  const testUsers = await db.select().from(users).where(like(users.email, `${EMAIL_NS}%`));
  for (const u of testUsers) {
    const uhs = await db.select().from(userHomes).where(eq(userHomes.userId, u.id));
    if (uhs.length) await db.delete(homes).where(inArray(homes.id, uhs.map((uh) => uh.homeId)));
  }
  await db.delete(users).where(like(users.email, `${EMAIL_NS}%`));
}

describe('QuoteManager', () => {
  let userId: string;
  let otherUserId: string;
  let jobId: string;
  let contractorId: string;

  beforeAll(async () => {
    await cleanup();
    const user = await userFactory.create({ email: `${EMAIL_NS}@example.com` });
    const other = await userFactory.create({ email: `${EMAIL_NS}-other@example.com` });
    userId = user.id;
    otherUserId = other.id;
    const home = await homeFactory.create({}, { transient: { userId } });
    const job = await jobFactory.create({ homeId: home.id, createdByUserId: userId });
    const contractor = await contractorFactory.create();
    jobId = job.id;
    contractorId = contractor.id;
  });

  afterAll(cleanup);

  describe('hasPermission', () => {
    it('returns true for job owner', async () => {
      const quote = await quoteFactory.create({ jobId, contractorId });
      expect(await QuoteManager.hasPermission(userId, quote.id)).toBe(true);
    });

    it('returns false for non-owner', async () => {
      const quote = await quoteFactory.create({ jobId, contractorId });
      expect(await QuoteManager.hasPermission(otherUserId, quote.id)).toBe(false);
    });

    it('returns false for unknown id', async () => {
      expect(await QuoteManager.hasPermission(userId, 'nonexistent-id')).toBe(false);
    });
  });

  describe('create / update / delete', () => {
    it('creates, updates, and deletes a quote', async () => {
      const quote = await quoteFactory.create({ jobId, contractorId });
      expect(quote.id).toBeDefined();

      const updated = await QuoteManager.update(quote.id, { status: QuoteStatus.CONFIRMED });
      expect(updated.status).toBe(QuoteStatus.CONFIRMED);

      await QuoteManager.delete(quote.id);
      expect(await QuoteManager.findById(quote.id)).toBeUndefined();
    });
  });

  describe('listForUser', () => {
    it('returns quotes for jobs the user has access to', async () => {
      const quote = await quoteFactory.create({ jobId, contractorId });
      const result = await QuoteManager.listForUser(userId, UserRole.USER, jobId);
      expect(result.some((r) => r.quote.id === quote.id)).toBe(true);
    });

    it('throws for user without job access', async () => {
      await expect(QuoteManager.listForUser(otherUserId, UserRole.USER, jobId)).rejects.toThrow();
    });
  });
});
