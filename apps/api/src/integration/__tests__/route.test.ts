import request from 'supertest';
import app from '@/app';
import { db } from '@/db';
import { users } from '@/auth/models/User';
import { like } from 'drizzle-orm';
import { userFactory } from '@/auth/factories/User.factory';

const EMAIL_NS = 'test-integration-route';

async function cleanup() {
  await db.delete(users).where(like(users.email, `${EMAIL_NS}%`));
}

async function loginAs(email: string) {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'password123' });
  return res.body.data.tokens.accessToken as string;
}

describe('Integrations API', () => {
  let token: string;

  beforeAll(async () => {
    await cleanup();
    await userFactory.create({ email: `${EMAIL_NS}@example.com` });
    token = await loginAs(`${EMAIL_NS}@example.com`);
  });

  afterAll(cleanup);

  describe('GET /api/v1/integrations', () => {
    it('returns empty list for new user', async () => {
      const res = await request(app)
        .get('/api/v1/integrations')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('401 without token', async () => {
      const res = await request(app).get('/api/v1/integrations');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/integrations/email/google/start', () => {
    it('returns an authorization URL', async () => {
      const res = await request(app)
        .get('/api/v1/integrations/email/google/start')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.authorizationUrl).toContain('auth.example.com');
    });

    it('401 without token', async () => {
      const res = await request(app).get('/api/v1/integrations/email/google/start');
      expect(res.status).toBe(401);
    });
  });
});
