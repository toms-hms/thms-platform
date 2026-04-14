import request from 'supertest';
import app from '../app';
import { db } from '../db';
import { users } from '../auth/models/User';
import { homes } from '../home/models/Home';
import { contractors } from '../contractor/models/Contractor';
import { userHomes } from '../home/models/UserHome';
import { userContractors } from '../contractor/models/UserContractor';
import { eq } from 'drizzle-orm';

const TEST_EMAIL = 'test-quotes@example.com';

async function cleanup() {
  const user = await db.select().from(users).where(eq(users.email, TEST_EMAIL)).limit(1);
  if (user[0]) {
    const uhs = await db.select().from(userHomes).where(eq(userHomes.userId, user[0].id));
    for (const uh of uhs) { await db.delete(homes).where(eq(homes.id, uh.homeId)); }
    const ucs = await db.select().from(userContractors).where(eq(userContractors.userId, user[0].id));
    for (const uc of ucs) { await db.delete(contractors).where(eq(contractors.id, uc.contractorId)); }
    await db.delete(users).where(eq(users.email, TEST_EMAIL));
  }
}

async function setup() {
  await cleanup();
  const authRes = await request(app).post('/api/v1/auth/register').send({
    email: TEST_EMAIL, password: 'password123', firstName: 'Quote', lastName: 'Tester',
  });
  const token = authRes.body.data.tokens.accessToken as string;
  const homeRes = await request(app).post('/api/v1/homes').set('Authorization', `Bearer ${token}`)
    .send({ name: 'Quote Home', address1: '1 St', city: 'Austin', state: 'TX', zipCode: '78701' });
  const jobRes = await request(app).post(`/api/v1/homes/${homeRes.body.data.id}/jobs`).set('Authorization', `Bearer ${token}`)
    .send({ title: 'Quote Job', category: 'deck' });
  const ctrRes = await request(app).post('/api/v1/contractors').set('Authorization', `Bearer ${token}`)
    .send({ name: 'Quote Ctr', category: 'deck' });
  await request(app).post(`/api/v1/jobs/${jobRes.body.data.id}/contractors`).set('Authorization', `Bearer ${token}`)
    .send({ contractorId: ctrRes.body.data.id });
  return { token, jobId: jobRes.body.data.id, contractorId: ctrRes.body.data.id };
}

describe('Quotes API', () => {
  let token: string;
  let jobId: string;
  let contractorId: string;
  let quoteId: string;

  beforeAll(async () => {
    const s = await setup();
    token = s.token; jobId = s.jobId; contractorId = s.contractorId;
  });

  afterAll(async () => { await cleanup(); });

  describe('POST /api/v1/jobs/:jobId/quotes', () => {
    it('should create a quote', async () => {
      const res = await request(app).post(`/api/v1/jobs/${jobId}/quotes`).set('Authorization', `Bearer ${token}`)
        .send({ contractorId, amount: 12000, description: 'Cedar deck estimate', status: 'DRAFT' });
      expect(res.status).toBe(201);
      expect(res.body.data.amount).toBe(12000);
      expect(res.body.data.status).toBe('DRAFT');
      quoteId = res.body.data.id;
    });

    it('should reject negative amount', async () => {
      const res = await request(app).post(`/api/v1/jobs/${jobId}/quotes`).set('Authorization', `Bearer ${token}`)
        .send({ contractorId, amount: -100 });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/jobs/:jobId/quotes', () => {
    it('should list quotes', async () => {
      const res = await request(app).get(`/api/v1/jobs/${jobId}/quotes`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('PATCH /api/v1/quotes/:quoteId', () => {
    it('should confirm a draft quote', async () => {
      const res = await request(app).patch(`/api/v1/quotes/${quoteId}`).set('Authorization', `Bearer ${token}`)
        .send({ status: 'CONFIRMED' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CONFIRMED');
    });
  });

  describe('DELETE /api/v1/quotes/:quoteId', () => {
    it('should delete a quote', async () => {
      const createRes = await request(app).post(`/api/v1/jobs/${jobId}/quotes`).set('Authorization', `Bearer ${token}`)
        .send({ contractorId, amount: 500 });
      const delRes = await request(app).delete(`/api/v1/quotes/${createRes.body.data.id}`).set('Authorization', `Bearer ${token}`);
      expect(delRes.status).toBe(200);
    });
  });
});
