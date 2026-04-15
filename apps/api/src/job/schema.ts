import { z } from 'zod';
import { JobStatus, JobContractorStatus, TradeCategory } from '@thms/shared';

export const CreateJobSchema = z.object({
  title: z.string().min(1),
  category: z.nativeEnum(TradeCategory),
  description: z.string().optional(),
  notes: z.string().optional(),
  status: z.nativeEnum(JobStatus).default(JobStatus.DRAFT),
});

export const UpdateJobSchema = CreateJobSchema.partial();

export const AssignContractorSchema = z.object({
  contractorId: z.string().min(1),
  notes: z.string().optional(),
});

export const UpdateJobContractorSchema = z.object({
  status: z.nativeEnum(JobContractorStatus),
  notes: z.string().optional(),
});
