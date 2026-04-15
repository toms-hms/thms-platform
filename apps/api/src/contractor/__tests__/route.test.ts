import request from 'supertest';
import app from '../../app';
import { db } from '../../db';
import { users } from '../../auth/models/User';
import { contractors } from '../models/Contractor';
import { like, eq } from 'drizzle-orm';
import { createUser } from '../../auth/factories/User.factory';
import { createContractor } from '../factories/Contractor.factory';
import { TradeCategory, UserRole } from '@thms/shared';

async function cleanup() {
  await db.delete(users).where(like(users.email, 'test-contractor-route%'));
  await db.delete(contractors).where(like(contractors.name, 'Test Route Contractor%'));
}

async function loginAs(email: string) {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'password123' });
  return res.body.data.tokens.accessToken as string;
}

describe('Contractors API', () => {
  let userToken: string;
  let adminToken: string;
  let contractorId: string;

  beforeAll(async () => {
    await cleanup();
    await createUser({ email: 'test-contractor-route@example.com', role: UserRole.USER });
    await createUser({ email: 'test-contractor-route-admin@example.com', role: UserRole.ADMIN });
    userToken = await loginAs('test-contractor-route@example.com');
    adminToken = await loginAs('test-contractor-route-admin@example.com');
  });

  afterAll(async () => { await cleanup(); });

  describe('GET /api/v1/contractors', () => {
    it('any authenticated user can list contractors', async () => {
      const res = await request(app).get('/api/v1/contractors').set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('filters by category', async () => {
      await createContractor({ name: 'Test Route Contractor', category: TradeCategory.ELECTRICAL });
      const res = await request(app).get(`/api/v1/contractors?category=${TradeCategory.ELECTRICAL}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(200);
      res.body.data.forEach((c: any) => expect(c.category).toBe(TradeCategory.ELECTRICAL));
    });

    it('401 without token', async () => {
      const res = await request(app).get('/api/v1/contractors');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/contractors', () => {
    it('admin can create a contractor', async () => {
      const res = await request(app).post('/api/v1/contractors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test Route Contractor New', category: TradeCategory.CARPENTRY });
      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Test Route Contractor New');
      contractorId = res.body.data.id;
    });

    it('403 for regular user', async () => {
      const res = await request(app).post('/api/v1/contractors')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Test Route Contractor Hack', category: TradeCategory.PLUMBING });
      expect(res.status).toBe(403);
    });

    it('rejects invalid category', async () => {
      const res = await request(app).post('/api/v1/contractors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Bad', category: 'deck' });
      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/v1/contractors/:contractorId', () => {
    it('admin can update a contractor', async () => {
      const res = await request(app).patch(`/api/v1/contractors/${contractorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ companyName: 'Updated Co' });
      expect(res.status).toBe(200);
      expect(res.body.data.companyName).toBe('Updated Co');
    });

    it('403 for regular user', async () => {
      const res = await request(app).patch(`/api/v1/contractors/${contractorId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ companyName: 'Hacked' });
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/contractors/:contractorId', () => {
    it('admin can delete a contractor', async () => {
      const extra = await createContractor({ name: 'Test Route Contractor Delete' });
      const res = await request(app).delete(`/api/v1/contractors/${extra.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });

    it('403 for regular user', async () => {
      const res = await request(app).delete(`/api/v1/contractors/${contractorId}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(403);
    });
  });
});
