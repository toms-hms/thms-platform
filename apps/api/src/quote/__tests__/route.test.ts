import request from 'supertest';
import app from '../../app';
import { db } from '../../db';
import { users } from '../../auth/models/User';
import { homes } from '../../home/models/Home';
import { userHomes } from '../../home/models/UserHome';
import { like, eq, inArray } from 'drizzle-orm';
import { userFactory } from '@/auth/factories/User.factory';
import { homeFactory } from '@/home/factories/Home.factory';
import { jobFactory } from '@/job/factories/Job.factory';
import { contractorFactory } from '@/contractor/factories/Contractor.factory';
import { jobContractorFactory } from '@/job/factories/JobContractor.factory';
import { quoteFactory } from '@/quote/factories/Quote.factory';

async function cleanup() {
  const testUsers = await db.select().from(users).where(like(users.email, 'test-quote-route%'));
  for (const u of testUsers) {
    const uhs = await db.select().from(userHomes).where(eq(userHomes.userId, u.id));
    if (uhs.length) await db.delete(homes).where(inArray(homes.id, uhs.map((uh) => uh.homeId)));
  }
  await db.delete(users).where(like(users.email, 'test-quote-route%'));
}

async function loginAs(email: string) {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'password123' });
  return res.body.data.tokens.accessToken as string;
}

describe('Quotes API', () => {
  let token: string;
  let otherToken: string;
  let jobId: string;
  let contractorId: string;
  let quoteId: string;

  beforeAll(async () => {
    await cleanup();
    const user = await userFactory.create({ email: 'test-quote-route@example.com' });
    await userFactory.create({ email: 'test-quote-route-other@example.com' });
    token = await loginAs('test-quote-route@example.com');
    otherToken = await loginAs('test-quote-route-other@example.com');
    const home = await homeFactory.create({}, { transient: { userId: user.id } });
    const job = await jobFactory.create({}, { transient: { homeId: home.id, userId: user.id } });
    const contractor = await contractorFactory.create();
    await jobContractorFactory.create({}, { transient: { jobId: job.id, contractorId: contractor.id } });
    jobId = job.id;
    contractorId = contractor.id;
  });

  afterAll(async () => { await cleanup(); });

  describe('POST /api/v1/jobs/:jobId/quotes', () => {
    it('creates a quote', async () => {
      const res = await request(app).post(`/api/v1/jobs/${jobId}/quotes`)
        .set('Authorization', `Bearer ${token}`)
        .send({ contractorId, amount: 12000, description: 'Cedar deck estimate', status: 'DRAFT' });
      expect(res.status).toBe(201);
      expect(res.body.data.amount).toBe(12000);
      expect(res.body.data.status).toBe('DRAFT');
      quoteId = res.body.data.id;
    });

    it('rejects negative amount', async () => {
      const res = await request(app).post(`/api/v1/jobs/${jobId}/quotes`)
        .set('Authorization', `Bearer ${token}`)
        .send({ contractorId, amount: -100 });
      expect(res.status).toBe(400);
    });

    it('403 for non-member', async () => {
      const res = await request(app).post(`/api/v1/jobs/${jobId}/quotes`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ contractorId, amount: 500 });
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/jobs/:jobId/quotes', () => {
    it('lists quotes for job', async () => {
      const res = await request(app).get(`/api/v1/jobs/${jobId}/quotes`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('403 for non-member', async () => {
      const res = await request(app).get(`/api/v1/jobs/${jobId}/quotes`).set('Authorization', `Bearer ${otherToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/v1/quotes/:quoteId', () => {
    it('confirms a draft quote', async () => {
      const quote = await quoteFactory.create({}, { transient: { jobId, contractorId } });
      const res = await request(app).patch(`/api/v1/quotes/${quote.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'CONFIRMED' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CONFIRMED');
    });
  });

  describe('DELETE /api/v1/quotes/:quoteId', () => {
    it('deletes a quote', async () => {
      const quote = await quoteFactory.create({}, { transient: { jobId, contractorId } });
      const res = await request(app).delete(`/api/v1/quotes/${quote.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });
});
