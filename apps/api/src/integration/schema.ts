import { z } from 'zod';
import type {
  TypedRequest,
  TypedParamsRequest,
} from '@/middleware/auth.middleware';

export const IntegrationParamsSchema = z.object({ integrationId: z.string().min(1) });

export type GetIntegrationsRequest   = TypedRequest;
export type GetIntegrationRequest    = TypedParamsRequest<typeof IntegrationParamsSchema>;
export type DeleteIntegrationRequest = TypedParamsRequest<typeof IntegrationParamsSchema>;
