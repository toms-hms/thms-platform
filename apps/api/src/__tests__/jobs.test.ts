import request from 'supertest';
import app from '../app';
import { db } from '../db';
import { users } from '../auth/models/User';
import { homes } from '../home/models/Home';
import { userHomes } from '../home/models/UserHome';
import { eq } from 'drizzle-orm';

const TEST_EMAIL = 'test-jobs@example.com';

async function cleanup() {
  const user = await db.select().from(users).where(eq(users.email, TEST_EMAIL)).limit(1);
  if (user[0]) {
    const uhs = await db.select().from(userHomes).where(eq(userHomes.userId, user[0].id));
    for (const uh of uhs) {
      await db.delete(homes).where(eq(homes.id, uh.homeId));
    }
    await db.delete(users).where(eq(users.email, TEST_EMAIL));
  }
}

async function setup() {
  await cleanup();
  const authRes = await request(app).post('/api/v1/auth/register').send({
    email: TEST_EMAIL, password: 'password123', firstName: 'Jobs', lastName: 'Tester',
  });
  const token = authRes.body.data.tokens.accessToken as string;
  const homeRes = await request(app)
    .post('/api/v1/homes')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Jobs Test Home', address1: '1 Main', city: 'Austin', state: 'TX', zipCode: '78701' });
  return { token, homeId: homeRes.body.data.id };
}

describe('Jobs API', () => {
  let token: string;
  let homeId: string;
  let jobId: string;

  beforeAll(async () => {
    const s = await setup();
    token = s.token;
    homeId = s.homeId;
  });

  afterAll(async () => { await cleanup(); });

  describe('POST /api/v1/homes/:homeId/jobs', () => {
    it('should create a job', async () => {
      const res = await request(app)
        .post(`/api/v1/homes/${homeId}/jobs`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Backyard Deck', category: 'deck', description: 'Build a cedar deck', status: 'DRAFT' });
      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('Backyard Deck');
      expect(res.body.data.status).toBe('DRAFT');
      jobId = res.body.data.id;
    });

    it('should reject missing title', async () => {
      const res = await request(app)
        .post(`/api/v1/homes/${homeId}/jobs`)
        .set('Authorization', `Bearer ${token}`)
        .send({ category: 'deck' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/homes/:homeId/jobs', () => {
    it('should list jobs for a home', async () => {
      const res = await request(app).get(`/api/v1/homes/${homeId}/jobs`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should filter by status', async () => {
      const res = await request(app).get(`/api/v1/homes/${homeId}/jobs?status=DRAFT`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      res.body.data.forEach((job: any) => expect(job.status).toBe('DRAFT'));
    });
  });

  describe('GET /api/v1/jobs/:jobId', () => {
    it('should get job detail', async () => {
      const res = await request(app).get(`/api/v1/jobs/${jobId}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(jobId);
      expect(res.body.data.contractors).toBeDefined();
    });
  });

  describe('PATCH /api/v1/jobs/:jobId', () => {
    it('should update job status', async () => {
      const res = await request(app)
        .patch(`/api/v1/jobs/${jobId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'PLANNING' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('PLANNING');
    });
  });

  describe('DELETE /api/v1/jobs/:jobId', () => {
    it('should delete a job', async () => {
      const createRes = await request(app)
        .post(`/api/v1/homes/${homeId}/jobs`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'To Delete', category: 'test' });
      const delRes = await request(app)
        .delete(`/api/v1/jobs/${createRes.body.data.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(delRes.status).toBe(200);
    });
  });
});
