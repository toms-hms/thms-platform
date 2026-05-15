import { request } from '@/lib/api';
import type { IntegrationDto } from '@thms/shared';

/** Returns all integrations for the current user. */
export function listIntegrations() {
  return request<{ data: IntegrationDto[] }>('/api/v1/integrations');
}

/** Starts the Google OAuth flow; returns the authorization URL to redirect to. */
export function startGoogleAuth() {
  return request<{ data: { authorizationUrl: string } }>('/api/v1/integrations/email/google/start');
}

/** Starts the Microsoft OAuth flow; returns the authorization URL to redirect to. */
export function startMicrosoftAuth() {
  return request<{ data: { authorizationUrl: string } }>('/api/v1/integrations/email/microsoft/start');
}
