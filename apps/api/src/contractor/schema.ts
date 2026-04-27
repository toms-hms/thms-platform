import { z } from 'zod';
import { TradeCategory } from '@thms/shared';

export const CreateContractorSchema = z.object({
  name:        z.string().min(1),
  companyName: z.string().optional(),
  email:       z.string().email().optional(),
  phone:       z.string().optional(),
  category:    z.nativeEnum(TradeCategory),
  notes:       z.string().optional(),
});

export const UpdateContractorSchema = CreateContractorSchema.partial();
