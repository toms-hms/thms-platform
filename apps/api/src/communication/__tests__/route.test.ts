import request from 'supertest';
import app from '@/app';
import { db } from '@/db';
import { users } from '@/auth/models/User';
import { homes } from '@/home/models/Home';
import { userHomes } from '@/home/models/UserHome';
import { jobs } from '@/job/models/Job';
import { communications } from '@/communication/models/Communication';
import { like, eq, inArray } from 'drizzle-orm';
import { userFactory } from '@/auth/factories/User.factory';
import { homeFactory } from '@/home/factories/Home.factory';
import { jobFactory } from '@/job/factories/Job.factory';
import { communicationFactory } from '@/communication/factories/Communication.factory';

const EMAIL_NS = 'test-comm-route';

async function cleanup() {
  const testUsers = await db.select().from(users).where(like(users.email, `${EMAIL_NS}%`));
  for (const u of testUsers) {
    const uhs = await db.select().from(userHomes).where(eq(userHomes.userId, u.id));
    if (uhs.length) {
      const homeIds = uhs.map((uh) => uh.homeId);
      const testJobs = await db.select().from(jobs).where(inArray(jobs.homeId, homeIds));
      if (testJobs.length) await db.delete(communications).where(inArray(communications.jobId, testJobs.map((j) => j.id)));
      await db.delete(homes).where(inArray(homes.id, homeIds));
    }
  }
  await db.delete(users).where(like(users.email, `${EMAIL_NS}%`));
}

async function loginAs(email: string) {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'password123' });
  return res.body.data.tokens.accessToken as string;
}

describe('Communications API', () => {
  let token: string;
  let commId: string;

  beforeAll(async () => {
    await cleanup();
    const user = await userFactory.create({ email: `${EMAIL_NS}@example.com` });
    token = await loginAs(`${EMAIL_NS}@example.com`);
    const home = await homeFactory.create({}, { transient: { userId: user.id } });
    const job = await jobFactory.create({ homeId: home.id, createdByUserId: user.id });

    const comm = await communicationFactory.create({ jobId: job.id, bodyText: 'Test body' });
    commId = comm.id;
  });

  afterAll(cleanup);

  describe('GET /api/v1/communications/:communicationId', () => {
    it('returns the communication', async () => {
      const res = await request(app)
        .get(`/api/v1/communications/${commId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(commId);
    });

    it('401 without token', async () => {
      const res = await request(app).get(`/api/v1/communications/${commId}`);
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/v1/communications/:communicationId', () => {
    it('updates needsReview', async () => {
      const res = await request(app)
        .patch(`/api/v1/communications/${commId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ needsReview: true });
      expect(res.status).toBe(200);
      expect(res.body.data.needsReview).toBe(true);
    });

    it('401 without token', async () => {
      const res = await request(app)
        .patch(`/api/v1/communications/${commId}`)
        .send({ needsReview: false });
      expect(res.status).toBe(401);
    });
  });
});
