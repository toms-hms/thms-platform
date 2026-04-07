import { z } from 'zod';

export const CreateContractorSchema = z.object({
  name: z.string().min(1),
  companyName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  category: z.string().min(1),
  notes: z.string().optional(),
});

export const UpdateContractorSchema = CreateContractorSchema.partial();
