import { z } from 'zod';
import { TradeCategory } from '@thms/shared';

export const CreateVendorSchema = z.object({
  name:        z.string().min(1),
  companyName: z.string().optional(),
  email:       z.string().email().optional(),
  phone:       z.string().optional(),
  notes:       z.string().optional(),
  categories:  z.array(z.nativeEnum(TradeCategory)).min(1),
  zipCodes:    z.array(z.string()).default([]),
});

export const UpdateVendorSchema = z.object({
  name:        z.string().min(1).optional(),
  companyName: z.string().optional(),
  email:       z.string().email().optional(),
  phone:       z.string().optional(),
  notes:       z.string().optional(),
  categories:  z.array(z.nativeEnum(TradeCategory)).min(1).optional(),
  zipCodes:    z.array(z.string()).optional(),
});
