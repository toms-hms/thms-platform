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
import * as quoteService from '../service';
import { QuoteManager } from '../models/QuoteManager';
import { QuoteStatus } from '@thms/shared';

const EMAIL_NS = 'test-quote-service';

async function cleanup() {
  const testUsers = await db.select().from(users).where(like(users.email, `${EMAIL_NS}%`));
  for (const u of testUsers) {
    const uhs = await db.select().from(userHomes).where(eq(userHomes.userId, u.id));
    if (uhs.length) await db.delete(homes).where(inArray(homes.id, uhs.map((uh) => uh.homeId)));
  }
  await db.delete(users).where(like(users.email, `${EMAIL_NS}%`));
}

describe('quote/service', () => {
  let jobId: string;
  let contractorId: string;

  beforeAll(async () => {
    await cleanup();
    const user = await userFactory.create({ email: `${EMAIL_NS}@example.com` });
    const home = await homeFactory.create({}, { transient: { userId: user.id } });
    const job = await jobFactory.create({ homeId: home.id, createdByUserId: user.id });
    const contractor = await contractorFactory.create();
    jobId = job.id;
    contractorId = contractor.id;
  });

  afterAll(cleanup);

  describe('createQuote', () => {
    it('creates a quote for a job', async () => {
      const quote = await quoteService.createQuote(jobId, {
        contractorId,
        amount: 5000,
        status: QuoteStatus.DRAFT,
      });
      expect(quote.id).toBeDefined();
      expect(quote.amount).toBe(5000);
      expect(quote.status).toBe(QuoteStatus.DRAFT);
    });
  });

  describe('updateQuote', () => {
    it('updates quote status', async () => {
      const quote = await quoteFactory.create({}, { transient: { jobId, contractorId } });
      const updated = await quoteService.updateQuote(quote.id, { status: QuoteStatus.CONFIRMED });
      expect(updated.status).toBe(QuoteStatus.CONFIRMED);
    });
  });

  describe('deleteQuote', () => {
    it('deletes the quote', async () => {
      const quote = await quoteFactory.create({}, { transient: { jobId, contractorId } });
      await quoteService.deleteQuote(quote.id);
      const found = await QuoteManager.findById(quote.id);
      expect(found).toBeUndefined();
    });
  });
});
