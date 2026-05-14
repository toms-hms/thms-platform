import { z } from 'zod';
import { TradeCategory } from '@thms/shared';
import type {
  TypedRequest,
  TypedParamsRequest,
  TypedQueryRequest,
  TypedBodyRequest,
  TypedParamsBodyRequest,
} from '@/middleware/auth.middleware';

export const ContractorParamsSchema = z.object({ contractorId: z.string().min(1) });
export const ContractorsQuerySchema = z.object({
  search:          z.string().optional(),
  tradeCategories: z.array(z.nativeEnum(TradeCategory)).optional(),
  zipCodes:        z.array(z.string()).optional(),
});

export type GetContractorsRequest   = TypedQueryRequest<typeof ContractorsQuerySchema>;
export type GetContractorRequest    = TypedParamsRequest<typeof ContractorParamsSchema>;
export type CreateContractorRequest = TypedBodyRequest<typeof CreateContractorSchema>;
export type UpdateContractorRequest = TypedParamsBodyRequest<typeof ContractorParamsSchema, typeof UpdateContractorSchema>;
export type DeleteContractorRequest = TypedParamsRequest<typeof ContractorParamsSchema>;

// Used for routes with no params or query filters (list, create)
export type ContractorsRequest = TypedRequest;

export const CreateContractorSchema = z.object({
  name:        z.string().min(1),
  companyName: z.string().optional(),
  email:       z.string().email().optional(),
  phone:       z.string().optional(),
  categories:  z.array(z.nativeEnum(TradeCategory)).min(1),
  zipCodes:    z.array(z.string()).optional(),
  notes:       z.string().optional(),
});

export const UpdateContractorSchema = z.object({
  name:        z.string().min(1).optional(),
  companyName: z.string().optional(),
  email:       z.string().email().optional(),
  phone:       z.string().optional(),
  categories:  z.array(z.nativeEnum(TradeCategory)).min(1).optional(),
  zipCodes:    z.array(z.string()).optional(),
  notes:       z.string().optional(),
});
