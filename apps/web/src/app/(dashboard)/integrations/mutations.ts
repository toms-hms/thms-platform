import { request } from '@/lib/api';
import type { IntegrationDto } from '@thms/shared';

/** Saves an AI provider API key as an integration. */
export function saveAI(data: { provider: string; apiKey: string }) {
  return request<{ data: IntegrationDto }>('/api/v1/integrations/ai', { method: 'POST', body: JSON.stringify(data) });
}

/** Disconnects and removes an integration by ID. */
export function disconnectIntegration(integrationId: string) {
  return request(`/api/v1/integrations/${integrationId}`, { method: 'DELETE' });
}
