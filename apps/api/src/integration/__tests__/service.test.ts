import { db } from '@/db';
import { users } from '@/auth/models/User';
import { integrations } from '../models/Integration';
import { like, eq } from 'drizzle-orm';
import { userFactory } from '@/auth/factories/User.factory';
import * as integrationService from '../service';
import { IntegrationManager } from '../models/IntegrationManager';
import { createId } from '@paralleldrive/cuid2';
import { encrypt } from '@/utils/crypto.utils';

const EMAIL_NS = 'test-integration-service';

async function cleanup() {
  const testUsers = await db.select().from(users).where(like(users.email, `${EMAIL_NS}%`));
  for (const u of testUsers) {
    await db.delete(integrations).where(eq(integrations.userId, u.id));
  }
  await db.delete(users).where(like(users.email, `${EMAIL_NS}%`));
}

describe('integration/service', () => {
  let userId: string;

  beforeAll(async () => {
    await cleanup();
    const user = await userFactory.create({ email: `${EMAIL_NS}@example.com` });
    userId = user.id;
  });

  afterAll(cleanup);

  describe('saveAIIntegration', () => {
    it('saves an AI integration and is idempotent', async () => {
      const first = await integrationService.saveAIIntegration(userId, 'openai', 'sk-test-key');
      expect(first.type).toBe('AI');
      expect(first.provider).toBe('OPENAI');

      const second = await integrationService.saveAIIntegration(userId, 'openai', 'sk-test-key-2');
      expect(second.id).toBe(first.id);
    });
  });

  describe('disconnectIntegration', () => {
    it('deletes the integration', async () => {
      const integration = await IntegrationManager.upsertByProvider(userId, 'GOOGLE', {
        id: createId(),
        type: 'EMAIL',
        accessTokenEnc: encrypt('token'),
        refreshTokenEnc: null,
        tokenExpiresAt: null,
        email: `${EMAIL_NS}@gmail.com`,
        scopes: [],
        updatedAt: new Date(),
      });
      await integrationService.disconnectIntegration(integration.id, userId);
      const found = await IntegrationManager.findById(integration.id);
      expect(found).toBeUndefined();
    });

    it('throws if user does not own the integration', async () => {
      const other = await userFactory.create({ email: `${EMAIL_NS}-other@example.com` });
      const integration = await IntegrationManager.upsertByProvider(other.id, 'OPENAI', {
        id: createId(),
        type: 'AI',
        accessTokenEnc: encrypt('key'),
        refreshTokenEnc: null,
        tokenExpiresAt: null,
        email: null,
        scopes: [],
        updatedAt: new Date(),
      });
      await expect(integrationService.disconnectIntegration(integration.id, userId)).rejects.toThrow();
    });
  });
});
