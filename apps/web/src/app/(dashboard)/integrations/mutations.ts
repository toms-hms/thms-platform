import { gqlRequest } from '@/lib/graphql';
import type { IntegrationDto } from '@/types/api';
import { INTEGRATION_FIELDS } from './queries';

/** Saves an AI provider API key as an integration. */
export async function saveAI(input: { provider: string; apiKey: string }): Promise<{ data: IntegrationDto }> {
  const data = await gqlRequest<{ saveAiIntegration: { integration: IntegrationDto } }>(
    `mutation SaveAi($provider: String!, $apiKey: String!) {
       saveAiIntegration(provider: $provider, apiKey: $apiKey) { integration { ${INTEGRATION_FIELDS} } }
     }`,
    input
  );
  return { data: data.saveAiIntegration.integration };
}

/** Disconnects and removes an integration by ID. */
export async function disconnectIntegration(integrationId: string): Promise<{ data: { success: boolean } }> {
  const data = await gqlRequest<{ disconnectIntegration: { success: boolean } }>(
    `mutation Disconnect($integrationId: ID!) {
       disconnectIntegration(integrationId: $integrationId) { success }
     }`,
    { integrationId }
  );
  return { data: data.disconnectIntegration };
}
