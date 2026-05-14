import { createId } from '@paralleldrive/cuid2';
import { Factory } from 'fishery';
import { userFactory } from '@/auth/factories/User.factory';
import { IntegrationManager } from '@/integration/models/IntegrationManager';
import { encrypt } from '@/utils/crypto.utils';
import { IntegrationProvider, IntegrationType } from '@thms/shared';
import type { Integration } from '@/integration/models/Integration';

export const integrationFactory = Factory.define<Integration>(({ onCreate, params }) => {
  onCreate(async (integration) => {
    const userId = params.userId ?? (await userFactory.create()).id;

    return IntegrationManager.upsertByProvider(userId, integration.provider, {
      id: integration.id,
      type: integration.type,
      accessTokenEnc: integration.accessTokenEnc,
      refreshTokenEnc: integration.refreshTokenEnc,
      tokenExpiresAt: integration.tokenExpiresAt,
      email: integration.email,
      scopes: integration.scopes,
      updatedAt: integration.updatedAt,
    });
  });

  return {
    id: createId(),
    userId: params.userId ?? createId(),
    type: params.type ?? IntegrationType.AI,
    provider: params.provider ?? IntegrationProvider.OPENAI,
    accessTokenEnc: params.accessTokenEnc ?? encrypt('test-token'),
    refreshTokenEnc: params.refreshTokenEnc ?? null,
    tokenExpiresAt: params.tokenExpiresAt ?? null,
    email: params.email ?? null,
    scopes: params.scopes ?? [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
});
