import { z } from 'zod';
import type {
  TypedRequest,
  TypedParamsRequest,
  TypedBodyRequest,
  TypedQueryRequest,
} from '@/middleware/auth.middleware';

export const IntegrationParamsSchema   = z.object({ integrationId: z.string().min(1) });
export const OAuthCallbackQuerySchema  = z.object({ code: z.string().min(1), state: z.string().min(1) });
export const SaveAiIntegrationSchema   = z.object({ provider: z.string().min(1), apiKey: z.string().min(1) });

export type GetIntegrationsRequest      = TypedRequest;
export type GetIntegrationRequest       = TypedParamsRequest<typeof IntegrationParamsSchema>;
export type DeleteIntegrationRequest    = TypedParamsRequest<typeof IntegrationParamsSchema>;
export type OAuthCallbackRequest        = TypedQueryRequest<typeof OAuthCallbackQuerySchema>;
export type SaveAiIntegrationRequest    = TypedBodyRequest<typeof SaveAiIntegrationSchema>;
