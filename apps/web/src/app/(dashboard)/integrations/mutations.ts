import { request } from '@/lib/api';

export function startGoogleAuth() {
  return request<{ data: { authorizationUrl: string } }>('/api/v1/integrations/email/google/start');
}

export function startMicrosoftAuth() {
  return request<{ data: { authorizationUrl: string } }>('/api/v1/integrations/email/microsoft/start');
}

export function saveAI(data: { provider: string; apiKey: string }) {
  return request<{ data: any }>('/api/v1/integrations/ai', { method: 'POST', body: JSON.stringify(data) });
}

export function disconnectIntegration(integrationId: string) {
  return request(`/api/v1/integrations/${integrationId}`, { method: 'DELETE' });
}
