import { db } from '@/db';
import { users } from '@/auth/models/User';
import { integrations } from '@/integration/models/Integration';
import { like, eq } from 'drizzle-orm';
import { userFactory } from '@/auth/factories/User.factory';
import { integrationFactory } from '@/integration/factories/Integration.factory';
import { IntegrationManager } from '@/integration/models/IntegrationManager';

const EMAIL_NS = 'test-integration-manager';

async function cleanup() {
  const testUsers = await db.select().from(users).where(like(users.email, `${EMAIL_NS}%`));
  for (const u of testUsers) {
    await db.delete(integrations).where(eq(integrations.userId, u.id));
  }
  await db.delete(users).where(like(users.email, `${EMAIL_NS}%`));
}

describe('IntegrationManager', () => {
  let userId: string;

  beforeAll(async () => {
    await cleanup();
    const user = await userFactory.create({ email: `${EMAIL_NS}@example.com` });
    userId = user.id;
  });

  afterAll(cleanup);

  describe('listForUser', () => {
    it('returns integrations for the user', async () => {
      await integrationFactory.create({ userId, provider: 'OPENAI', type: 'AI' });
      const list = await IntegrationManager.listForUser(userId);
      expect(list.some((i) => i.userId === userId)).toBe(true);
    });
  });

  describe('upsertByProvider', () => {
    it('creates or updates an integration', async () => {
      const first = await integrationFactory.create({ userId, provider: 'OPENAI', type: 'AI' });
      const second = await integrationFactory.create({ userId, provider: 'OPENAI', type: 'AI' });
      expect(second.id).toBe(first.id);
    });
  });

  describe('delete', () => {
    it('deletes an integration', async () => {
      const integration = await integrationFactory.create({
        userId,
        provider: 'GOOGLE',
        type: 'EMAIL',
        email: 'test@gmail.com',
      });
      await IntegrationManager.delete(integration.id);
      const found = await IntegrationManager.findById(integration.id);
      expect(found).toBeUndefined();
    });
  });
});
