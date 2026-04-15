import { request } from '@/lib/api';

export function listIntegrations() {
  return request<{ data: any[] }>('/api/v1/integrations');
}
