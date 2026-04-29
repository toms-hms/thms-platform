import request from 'supertest';
import app from '../../app';
import { db } from '../../db';
import { users } from '../../auth/models/User';
import { contractors } from '../models/Contractor';
import { like } from 'drizzle-orm';
import { userFactory } from '@/auth/factories/User.factory';
import { contractorFactory } from '@/contractor/factories/Contractor.factory';
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
    await userFactory.create({ email: 'test-contractor-route@example.com', role: UserRole.USER });
    await userFactory.create({ email: 'test-contractor-route-admin@example.com', role: UserRole.ADMIN });
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
      await contractorFactory.create({ name: 'Test Route Contractor', categories: [TradeCategory.ELECTRICAL] });
      const res = await request(app).get(`/api/v1/contractors?category=${TradeCategory.ELECTRICAL}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(200);
      res.body.data.forEach((c: any) => expect(c.categories).toContain(TradeCategory.ELECTRICAL));
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
        .send({ name: 'Test Route Contractor New', categories: [TradeCategory.CARPENTRY], zipCodes: ['78701'] });
      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Test Route Contractor New');
      expect(res.body.data.categories).toContain(TradeCategory.CARPENTRY);
      expect(res.body.data.zipCodes).toContain('78701');
      contractorId = res.body.data.id;
    });

    it('403 for regular user', async () => {
      const res = await request(app).post('/api/v1/contractors')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Test Route Contractor Hack', categories: [TradeCategory.PLUMBING] });
      expect(res.status).toBe(403);
    });

    it('rejects missing categories', async () => {
      const res = await request(app).post('/api/v1/contractors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Bad' });
      expect(res.status).toBe(400);
    });

    it('rejects invalid category value', async () => {
      const res = await request(app).post('/api/v1/contractors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Bad', categories: ['deck'] });
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

    it('admin can replace categories and zip codes', async () => {
      const res = await request(app).patch(`/api/v1/contractors/${contractorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ categories: [TradeCategory.PLUMBING, TradeCategory.HVAC], zipCodes: ['78702', '78703'] });
      expect(res.status).toBe(200);
      expect(res.body.data.categories).toEqual(expect.arrayContaining([TradeCategory.PLUMBING, TradeCategory.HVAC]));
      expect(res.body.data.zipCodes).toEqual(expect.arrayContaining(['78702', '78703']));
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
      const extra = await contractorFactory.create({ name: 'Test Route Contractor Delete' });
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
