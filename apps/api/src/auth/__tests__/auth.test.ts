import request from 'supertest';
import app from '../../app';
import { db } from '../../db';
import { users } from '../models/User';
import { like } from 'drizzle-orm';

async function cleanup() {
  await db.delete(users).where(like(users.email, 'test-auth%'));
}

describe('Auth API', () => {
  beforeEach(async () => { await cleanup(); });
  afterAll(async () => { await cleanup(); });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'test-auth@example.com', password: 'password123', firstName: 'Test', lastName: 'User',
      });
      expect(res.status).toBe(201);
      expect(res.body.data.user.email).toBe('test-auth@example.com');
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      const data = { email: 'test-auth-dup@example.com', password: 'password123', firstName: 'Test', lastName: 'User' };
      await request(app).post('/api/v1/auth/register').send(data);
      const res = await request(app).post('/api/v1/auth/register').send(data);
      expect(res.status).toBe(409);
    });

    it('should reject weak password', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'test-auth-weak@example.com', password: '123', firstName: 'Test', lastName: 'User',
      });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      await request(app).post('/api/v1/auth/register').send({
        email: 'test-auth-login@example.com', password: 'password123', firstName: 'Test', lastName: 'User',
      });
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'test-auth-login@example.com', password: 'password123',
      });
      expect(res.status).toBe(200);
      expect(res.body.data.tokens.accessToken).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'nonexistent@example.com', password: 'wrongpassword',
      });
      expect(res.status).toBe(401);
    });
  });
});
