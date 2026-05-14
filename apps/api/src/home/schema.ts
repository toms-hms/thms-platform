import { z } from 'zod';
import type {
  TypedRequest,
  TypedParamsRequest,
  TypedParamsBodyRequest,
} from '@/middleware/auth.middleware';

export const HomeParamsSchema = z.object({ homeId: z.string().min(1) });
export type GetHomeRequest    = TypedParamsRequest<typeof HomeParamsSchema>;
export type UpdateHomeRequest = TypedParamsBodyRequest<typeof HomeParamsSchema, typeof UpdateHomeSchema>;
export type DeleteHomeRequest = TypedParamsRequest<typeof HomeParamsSchema>;
export type CreateHomeRequest = TypedRequest;

export const CreateHomeSchema = z.object({
  name: z.string().min(1),
  address1: z.string().min(1),
  address2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(2).max(2),
  zipCode: z.string().min(5),
  country: z.string().default('US'),
  notes: z.string().optional(),
});

export const UpdateHomeSchema = z.object({
  name: z.string().min(1).optional(),
  address1: z.string().min(1).optional(),
  address2: z.string().optional(),
  city: z.string().min(1).optional(),
  state: z.string().min(2).max(2).optional(),
  zipCode: z.string().min(5).optional(),
  notes: z.string().optional(),
});
