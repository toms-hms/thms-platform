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
import { TradeCategory } from '@thms/shared';

async function cleanup() {
  const testUsers = await db.select().from(users).where(like(users.email, 'test-job-route%'));
  for (const u of testUsers) {
    const uhs = await db.select().from(userHomes).where(eq(userHomes.userId, u.id));
    if (uhs.length) await db.delete(homes).where(inArray(homes.id, uhs.map((uh) => uh.homeId)));
  }
  await db.delete(users).where(like(users.email, 'test-job-route%'));
}

async function loginAs(email: string) {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'password123' });
  return res.body.data.tokens.accessToken as string;
}

describe('Jobs API', () => {
  let token: string;
  let otherToken: string;
  let homeId: string;
  let jobId: string;

  beforeAll(async () => {
    await cleanup();
    const user = await userFactory.create({ email: 'test-job-route@example.com' });
    await userFactory.create({ email: 'test-job-route-other@example.com' });
    token = await loginAs('test-job-route@example.com');
    otherToken = await loginAs('test-job-route-other@example.com');
    const home = await homeFactory.create({}, { transient: { userId: user.id } });
    homeId = home.id;
  });

  afterAll(async () => { await cleanup(); });

  describe('POST /api/v1/homes/:homeId/jobs', () => {
    it('creates a job', async () => {
      const res = await request(app).post(`/api/v1/homes/${homeId}/jobs`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Fix Sink', category: TradeCategory.PLUMBING, description: 'Dripping faucet' });
      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('Fix Sink');
      expect(res.body.data.status).toBe('DRAFT');
      jobId = res.body.data.id;
    });

    it('rejects missing title', async () => {
      const res = await request(app).post(`/api/v1/homes/${homeId}/jobs`)
        .set('Authorization', `Bearer ${token}`)
        .send({ category: TradeCategory.PLUMBING });
      expect(res.status).toBe(400);
    });

    it('rejects invalid category', async () => {
      const res = await request(app).post(`/api/v1/homes/${homeId}/jobs`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Test', category: 'deck' });
      expect(res.status).toBe(400);
    });

    it('403 for non-member', async () => {
      const res = await request(app).post(`/api/v1/homes/${homeId}/jobs`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ title: 'Hack', category: TradeCategory.PLUMBING });
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/homes/:homeId/jobs', () => {
    it('lists jobs for home', async () => {
      const res = await request(app).get(`/api/v1/homes/${homeId}/jobs`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('filters by status', async () => {
      const res = await request(app).get(`/api/v1/homes/${homeId}/jobs?status=DRAFT`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      res.body.data.forEach((j: any) => expect(j.status).toBe('DRAFT'));
    });

    it('403 for non-member', async () => {
      const res = await request(app).get(`/api/v1/homes/${homeId}/jobs`).set('Authorization', `Bearer ${otherToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/jobs/:jobId', () => {
    it('returns job detail with nested data', async () => {
      const res = await request(app).get(`/api/v1/jobs/${jobId}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(jobId);
      expect(res.body.data.contractors).toBeDefined();
    });

    it('403 for non-member', async () => {
      const res = await request(app).get(`/api/v1/jobs/${jobId}`).set('Authorization', `Bearer ${otherToken}`);
      expect(res.status).toBe(403);
    });

    it('401 without token', async () => {
      const res = await request(app).get(`/api/v1/jobs/${jobId}`);
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/v1/jobs/:jobId', () => {
    it('updates job status', async () => {
      const res = await request(app).patch(`/api/v1/jobs/${jobId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'PLANNING' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('PLANNING');
    });

    it('403 for non-member', async () => {
      const res = await request(app).patch(`/api/v1/jobs/${jobId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ status: 'PLANNING' });
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/jobs/:jobId', () => {
    it('deletes a job', async () => {
      const user = await db.select().from(users).where(like(users.email, 'test-job-route@example.com')).limit(1);
      const extraJob = await jobFactory.create({}, { transient: { homeId, userId: user[0].id } });
      const res = await request(app).delete(`/api/v1/jobs/${extraJob.id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('403 for non-member', async () => {
      const res = await request(app).delete(`/api/v1/jobs/${jobId}`).set('Authorization', `Bearer ${otherToken}`);
      expect(res.status).toBe(403);
    });
  });
});
