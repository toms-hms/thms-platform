import request from 'supertest';
import app from '../app';
import { prisma } from '../config/prisma';

const TEST_EMAIL = 'test-contractors@example.com';

describe('Contractors API', () => {
  let token: string;
  let contractorId: string;

  beforeAll(async () => {
    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
    const authRes = await request(app).post('/api/v1/auth/register').send({
      email: TEST_EMAIL,
      password: 'password123',
      firstName: 'Ctr',
      lastName: 'Tester',
    });
    token = authRes.body.data.tokens.accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
    await prisma.$disconnect();
  });

  describe('POST /api/v1/contractors', () => {
    it('should create a contractor', async () => {
      const res = await request(app)
        .post('/api/v1/contractors')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'John Smith',
          companyName: 'Smith Decks',
          email: 'john@smithdecks.com',
          phone: '5125551212',
          category: 'deck',
          notes: 'Good recommendation',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('John Smith');
      contractorId = res.body.data.id;
    });

    it('should reject missing name', async () => {
      const res = await request(app)
        .post('/api/v1/contractors')
        .set('Authorization', `Bearer ${token}`)
        .send({ category: 'deck' });

      expect(res.status).toBe(400);
    });

    it('should reject invalid email', async () => {
      const res = await request(app)
        .post('/api/v1/contractors')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test', category: 'deck', email: 'notanemail' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/contractors', () => {
    it('should list contractors', async () => {
      const res = await request(app)
        .get('/api/v1/contractors')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should search contractors', async () => {
      const res = await request(app)
        .get('/api/v1/contractors?search=john')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.some((c: any) => c.name.toLowerCase().includes('john'))).toBe(true);
    });

    it('should filter by category', async () => {
      const res = await request(app)
        .get('/api/v1/contractors?category=deck')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      res.body.data.forEach((c: any) => expect(c.category).toContain('deck'));
    });
  });

  describe('PATCH /api/v1/contractors/:contractorId', () => {
    it('should update a contractor', async () => {
      const res = await request(app)
        .patch(`/api/v1/contractors/${contractorId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ companyName: 'Updated Company' });

      expect(res.status).toBe(200);
      expect(res.body.data.companyName).toBe('Updated Company');
    });
  });

  describe('DELETE /api/v1/contractors/:contractorId', () => {
    it('should delete a contractor', async () => {
      const createRes = await request(app)
        .post('/api/v1/contractors')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'To Delete', category: 'test' });

      const delRes = await request(app)
        .delete(`/api/v1/contractors/${createRes.body.data.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(delRes.status).toBe(200);
    });
  });
});
