import { request } from '@/lib/api';

export function updateCommunication(communicationId: string, data: any) {
  return request<{ data: any }>(`/api/v1/communications/${communicationId}`, { method: 'PATCH', body: JSON.stringify(data) });
}
