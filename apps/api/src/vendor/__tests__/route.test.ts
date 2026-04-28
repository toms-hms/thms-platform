import request from 'supertest';
import app from '../../app';
import { db } from '../../db';
import { users } from '../../auth/models/User';
import { vendors } from '../models/Vendor';
import { like } from 'drizzle-orm';
import { userFactory } from '@/auth/factories/User.factory';
import { vendorFactory } from '@/vendor/factories/Vendor.factory';
import { TradeCategory, UserRole } from '@thms/shared';

async function cleanup() {
  await db.delete(vendors).where(like(vendors.name, 'Test Route Vendor%'));
  await db.delete(users).where(like(users.email, 'test-vendor-route%'));
}

async function loginAs(email: string) {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'password123' });
  return res.body.data.tokens.accessToken as string;
}

describe('Vendors API', () => {
  let userToken: string;
  let adminToken: string;
  let vendorId: string;

  beforeAll(async () => {
    await cleanup();
    await userFactory.create({ email: 'test-vendor-route@example.com', role: UserRole.USER });
    await userFactory.create({ email: 'test-vendor-route-admin@example.com', role: UserRole.ADMIN });
    userToken = await loginAs('test-vendor-route@example.com');
    adminToken = await loginAs('test-vendor-route-admin@example.com');
  });

  afterAll(async () => { await cleanup(); });

  describe('GET /api/v1/vendors', () => {
    it('any authenticated user can list vendors', async () => {
      const res = await request(app).get('/api/v1/vendors').set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('filters by category', async () => {
      await vendorFactory.create({
        name: 'Test Route Vendor Filter',
        categories: [TradeCategory.ELECTRICAL],
        zipCodes: [],
      });
      const res = await request(app)
        .get(`/api/v1/vendors?category=${TradeCategory.ELECTRICAL}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(200);
      res.body.data.forEach((v: any) => expect(v.categories).toContain(TradeCategory.ELECTRICAL));
    });

    it('401 without token', async () => {
      const res = await request(app).get('/api/v1/vendors');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/vendors', () => {
    it('admin can create a vendor with categories and zip codes', async () => {
      const res = await request(app)
        .post('/api/v1/vendors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name:       'Test Route Vendor New',
          categories: [TradeCategory.CARPENTRY, TradeCategory.PAINTING],
          zipCodes:   ['78701', '78702'],
        });
      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Test Route Vendor New');
      expect(res.body.data.categories).toContain(TradeCategory.CARPENTRY);
      expect(res.body.data.categories).toContain(TradeCategory.PAINTING);
      expect(res.body.data.zipCodes).toContain('78701');
      vendorId = res.body.data.id;
    });

    it('403 for regular user', async () => {
      const res = await request(app)
        .post('/api/v1/vendors')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Hack Vendor', categories: [TradeCategory.PLUMBING] });
      expect(res.status).toBe(403);
    });

    it('rejects missing categories', async () => {
      const res = await request(app)
        .post('/api/v1/vendors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'No Cat Vendor', categories: [] });
      expect(res.status).toBe(400);
    });

    it('rejects invalid category value', async () => {
      const res = await request(app)
        .post('/api/v1/vendors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Bad Cat', categories: ['DECK'] });
      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/v1/vendors/:vendorId', () => {
    it('admin can update categories and zip codes', async () => {
      const res = await request(app)
        .patch(`/api/v1/vendors/${vendorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ categories: [TradeCategory.FLOORING], zipCodes: ['90210'] });
      expect(res.status).toBe(200);
      expect(res.body.data.categories).toEqual([TradeCategory.FLOORING]);
      expect(res.body.data.zipCodes).toEqual(['90210']);
    });

    it('admin can update name without touching categories', async () => {
      const res = await request(app)
        .patch(`/api/v1/vendors/${vendorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ companyName: 'Updated Co' });
      expect(res.status).toBe(200);
      expect(res.body.data.companyName).toBe('Updated Co');
    });

    it('403 for regular user', async () => {
      const res = await request(app)
        .patch(`/api/v1/vendors/${vendorId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ companyName: 'Hacked' });
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/vendors/:vendorId', () => {
    it('admin can delete a vendor', async () => {
      const extra = await vendorFactory.create({ name: 'Test Route Vendor Delete' });
      const res = await request(app)
        .delete(`/api/v1/vendors/${extra.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });

    it('403 for regular user', async () => {
      const res = await request(app)
        .delete(`/api/v1/vendors/${vendorId}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(403);
    });
  });
});
