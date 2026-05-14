import { db } from '@/db';
import { users } from '@/auth/models/User';
import { integrations } from '../models/Integration';
import { like, eq } from 'drizzle-orm';
import { userFactory } from '@/auth/factories/User.factory';
import { IntegrationManager } from '../models/IntegrationManager';
import { createId } from '@paralleldrive/cuid2';
import { encrypt } from '@/utils/crypto.utils';

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
      await IntegrationManager.upsertByProvider(userId, 'OPENAI', {
        id: createId(),
        type: 'AI',
        accessTokenEnc: encrypt('test-key'),
        refreshTokenEnc: null,
        tokenExpiresAt: null,
        email: null,
        scopes: [],
        updatedAt: new Date(),
      });
      const list = await IntegrationManager.listForUser(userId);
      expect(list.some((i) => i.userId === userId)).toBe(true);
    });
  });

  describe('upsertByProvider', () => {
    it('creates or updates an integration', async () => {
      const first = await IntegrationManager.upsertByProvider(userId, 'OPENAI', {
        id: createId(),
        type: 'AI',
        accessTokenEnc: encrypt('key-1'),
        refreshTokenEnc: null,
        tokenExpiresAt: null,
        email: null,
        scopes: [],
        updatedAt: new Date(),
      });
      const second = await IntegrationManager.upsertByProvider(userId, 'OPENAI', {
        id: createId(),
        type: 'AI',
        accessTokenEnc: encrypt('key-2'),
        refreshTokenEnc: null,
        tokenExpiresAt: null,
        email: null,
        scopes: [],
        updatedAt: new Date(),
      });
      expect(second.id).toBe(first.id);
    });
  });

  describe('delete', () => {
    it('deletes an integration', async () => {
      const integration = await IntegrationManager.upsertByProvider(userId, 'GOOGLE', {
        id: createId(),
        type: 'EMAIL',
        accessTokenEnc: encrypt('token'),
        refreshTokenEnc: null,
        tokenExpiresAt: null,
        email: 'test@gmail.com',
        scopes: [],
        updatedAt: new Date(),
      });
      await IntegrationManager.delete(integration.id);
      const found = await IntegrationManager.findById(integration.id);
      expect(found).toBeUndefined();
    });
  });
});
