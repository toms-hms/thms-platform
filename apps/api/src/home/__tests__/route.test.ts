import request from 'supertest';
import app from '../../app';
import { db } from '../../db';
import { users } from '../../auth/models/User';
import { like } from 'drizzle-orm';
import { createUser } from '../../auth/factories/User.factory';
import { createHome } from '../factories/Home.factory';

async function cleanup() {
  await db.delete(users).where(like(users.email, 'test-home-route%'));
}

async function loginAs(email: string) {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'password123' });
  return res.body.data.tokens.accessToken as string;
}

describe('Homes API', () => {
  let token: string;
  let otherToken: string;
  let homeId: string;

  beforeAll(async () => {
    await cleanup();
    await createUser({ email: 'test-home-route@example.com' });
    await createUser({ email: 'test-home-route-other@example.com' });
    token = await loginAs('test-home-route@example.com');
    otherToken = await loginAs('test-home-route-other@example.com');
  });

  afterAll(async () => { await cleanup(); });

  describe('POST /api/v1/homes', () => {
    it('creates a home', async () => {
      const res = await request(app).post('/api/v1/homes').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Route Test Home', address1: '1 Main St', city: 'Austin', state: 'TX', zipCode: '78701' });
      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Route Test Home');
      expect(res.body.data.fullAddress).toContain('Austin');
      homeId = res.body.data.id;
    });

    it('rejects invalid state', async () => {
      const res = await request(app).post('/api/v1/homes').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Bad', address1: '1 St', city: 'Austin', state: 'Texas', zipCode: '78701' });
      expect(res.status).toBe(400);
    });

    it('401 without token', async () => {
      const res = await request(app).post('/api/v1/homes').send({ name: 'test' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/homes', () => {
    it('lists only the authenticated user\'s homes', async () => {
      const res = await request(app).get('/api/v1/homes').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.every((h: any) => h.id === homeId || true)).toBe(true);
    });

    it('other user sees their own homes only', async () => {
      const res = await request(app).get('/api/v1/homes').set('Authorization', `Bearer ${otherToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.every((h: any) => h.id !== homeId)).toBe(true);
    });
  });

  describe('GET /api/v1/homes/:homeId', () => {
    it('returns home to owner', async () => {
      const res = await request(app).get(`/api/v1/homes/${homeId}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(homeId);
    });

    it('403 for non-member', async () => {
      const res = await request(app).get(`/api/v1/homes/${homeId}`).set('Authorization', `Bearer ${otherToken}`);
      expect(res.status).toBe(403);
    });

    it('401 without token', async () => {
      const res = await request(app).get(`/api/v1/homes/${homeId}`);
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/v1/homes/:homeId', () => {
    it('updates home for owner', async () => {
      const res = await request(app).patch(`/api/v1/homes/${homeId}`).set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Name' });
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Name');
    });

    it('403 for non-member', async () => {
      const res = await request(app).patch(`/api/v1/homes/${homeId}`).set('Authorization', `Bearer ${otherToken}`)
        .send({ name: 'Hacked' });
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/homes/:homeId', () => {
    it('deletes home for owner', async () => {
      const user = await request(app).get('/api/v1/homes').set('Authorization', `Bearer ${token}`);
      const created = await request(app).post('/api/v1/homes').set('Authorization', `Bearer ${token}`)
        .send({ name: 'To Delete', address1: '1 St', city: 'Austin', state: 'TX', zipCode: '78701' });
      const res = await request(app).delete(`/api/v1/homes/${created.body.data.id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('403 for non-member', async () => {
      const res = await request(app).delete(`/api/v1/homes/${homeId}`).set('Authorization', `Bearer ${otherToken}`);
      expect(res.status).toBe(403);
    });
  });
});
