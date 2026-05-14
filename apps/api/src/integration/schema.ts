import { z } from 'zod';
import type { TypedRequest } from '@/middleware/auth.middleware';

export const IntegrationSchema = z.object({ integrationId: z.string().min(1) });
export type IntegrationRequest = TypedRequest<z.infer<typeof IntegrationSchema>>;
export type IntegrationsRequest = TypedRequest;
