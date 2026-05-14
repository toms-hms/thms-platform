import { z } from 'zod';
import { TradeCategory } from '@thms/shared';
import type { TypedRequest } from '@/middleware/auth.middleware';

export const ContractorSchema = z.object({ contractorId: z.string().min(1) });
export type ContractorRequest = TypedRequest<z.infer<typeof ContractorSchema>>;
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
