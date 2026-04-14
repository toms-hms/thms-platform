import request from 'supertest';
import app from '../app';
import { db } from '../db';
import { users } from '../auth/models/User';
import { homes } from '../home/models/Home';
import { userHomes } from '../home/models/UserHome';
import { eq } from 'drizzle-orm';

const TEST_EMAIL = 'test-homes@example.com';

async function cleanup() {
  const user = await db.select().from(users).where(eq(users.email, TEST_EMAIL)).limit(1);
  if (user[0]) {
    const userHomeList = await db.select().from(userHomes).where(eq(userHomes.userId, user[0].id));
    for (const uh of userHomeList) {
      await db.delete(homes).where(eq(homes.id, uh.homeId));
    }
    await db.delete(users).where(eq(users.email, TEST_EMAIL));
  }
}

async function registerAndGetToken(email = TEST_EMAIL) {
  const res = await request(app).post('/api/v1/auth/register').send({
    email, password: 'password123', firstName: 'Test', lastName: 'User',
  });
  return res.body.data.tokens.accessToken as string;
}

describe('Homes API', () => {
  let token: string;
  let homeId: string;

  beforeAll(async () => {
    await cleanup();
    token = await registerAndGetToken();
  });

  afterAll(async () => { await cleanup(); });

  describe('POST /api/v1/homes', () => {
    it('should create a home', async () => {
      const res = await request(app)
        .post('/api/v1/homes')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Home', address1: '123 Main St', city: 'Austin', state: 'TX', zipCode: '78745' });
      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Test Home');
      expect(res.body.data.fullAddress).toContain('Austin');
      homeId = res.body.data.id;
    });

    it('should reject invalid state', async () => {
      const res = await request(app)
        .post('/api/v1/homes')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Bad Home', address1: '123 Main St', city: 'Austin', state: 'Texas', zipCode: '78745' });
      expect(res.status).toBe(400);
    });

    it('should reject without auth', async () => {
      const res = await request(app).post('/api/v1/homes').send({ name: 'test' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/homes', () => {
    it('should list homes', async () => {
      const res = await request(app).get('/api/v1/homes').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/homes/:homeId', () => {
    it('should get a home by id', async () => {
      const res = await request(app).get(`/api/v1/homes/${homeId}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(homeId);
    });

    it('should return 404 for unknown home', async () => {
      const res = await request(app).get('/api/v1/homes/unknown-id').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/homes/:homeId', () => {
    it('should update a home', async () => {
      const res = await request(app)
        .patch(`/api/v1/homes/${homeId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Home Name' });
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Home Name');
    });
  });

  describe('DELETE /api/v1/homes/:homeId', () => {
    it('should delete a home', async () => {
      const createRes = await request(app)
        .post('/api/v1/homes')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'To Delete', address1: '1 St', city: 'Austin', state: 'TX', zipCode: '78701' });
      const delRes = await request(app)
        .delete(`/api/v1/homes/${createRes.body.data.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(delRes.status).toBe(200);
    });
  });
});
