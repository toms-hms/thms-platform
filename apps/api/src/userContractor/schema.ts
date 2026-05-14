import { z } from 'zod';
import { TradeCategory } from '@thms/shared';
import type {
  TypedRequest,
  TypedParamsRequest,
  TypedBodyRequest,
} from '@/middleware/auth.middleware';

export const UserContractorParamsSchema = z.object({ userContractorId: z.string().min(1) });

export type GetUserContractorRequest    = TypedParamsRequest<typeof UserContractorParamsSchema>;
export type CreateUserContractorRequest = TypedBodyRequest<typeof CreateUserContractorSchema>;
export type DeleteUserContractorRequest = TypedParamsRequest<typeof UserContractorParamsSchema>;
export type UserContractorsRequest      = TypedRequest;

export const CreateUserContractorSchema = z.object({
  contractorId: z.string().min(1).optional(),
  note:         z.string().optional(),
  // Fields for creating a new private contractor on the fly
  name:         z.string().min(1).optional(),
  companyName:  z.string().optional(),
  email:        z.string().email().optional(),
  phone:        z.string().optional(),
  categories:   z.array(z.nativeEnum(TradeCategory)).optional(),
  zipCodes:     z.array(z.string()).optional(),
  notes:        z.string().optional(),
}).refine(
  (d) => d.contractorId || d.name,
  { message: 'Either contractorId or name is required' }
);
