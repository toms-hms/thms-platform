import { gqlRequest } from '@/lib/graphql';
import type { IntegrationDto } from '@/types/api';

export const INTEGRATION_FIELDS = `id type provider status email scopes createdAt updatedAt`;

/** Returns all integrations for the current user. */
export async function listIntegrations(): Promise<{ data: IntegrationDto[] }> {
  const data = await gqlRequest<{ integrations: IntegrationDto[] }>(
    `query { integrations { ${INTEGRATION_FIELDS} } }`
  );
  return { data: data.integrations };
}

/** Starts the Google OAuth flow; returns the authorization URL to redirect to. */
export async function startGoogleAuth(): Promise<{ data: { authorizationUrl: string } }> {
  const data = await gqlRequest<{ googleAuthUrl: string }>(`query { googleAuthUrl }`);
  return { data: { authorizationUrl: data.googleAuthUrl } };
}

/** Starts the Microsoft OAuth flow; returns the authorization URL to redirect to. */
export async function startMicrosoftAuth(): Promise<{ data: { authorizationUrl: string } }> {
  const data = await gqlRequest<{ microsoftAuthUrl: string }>(`query { microsoftAuthUrl }`);
  return { data: { authorizationUrl: data.microsoftAuthUrl } };
}
