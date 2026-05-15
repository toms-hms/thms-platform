import { z } from 'zod';
import { JobContractorStatus } from '@/job/models/JobContractor';
import type {
  TypedParamsRequest,
  TypedQueryRequest,
  TypedBodyRequest,
  TypedParamsBodyRequest,
} from '@/middleware/auth.middleware';

// ─── Path param schemas ───────────────────────────────────────────────────────

export const JobContractorParamsSchema = z.object({ jobContractorId: z.string().min(1) });

// ─── Query schemas (list filters) ─────────────────────────────────────────────

export const JobContractorsQuerySchema = z.object({ jobId: z.string().optional() });

// ─── Body schemas ─────────────────────────────────────────────────────────────

export const AssignContractorSchema = z.object({
  jobId:        z.string().min(1),
  contractorId: z.string().min(1),
  notes:        z.string().optional(),
});

export const UpdateJobContractorSchema = z.object({
  status: z.nativeEnum(JobContractorStatus),
  notes:  z.string().optional(),
});

// ─── Request types ────────────────────────────────────────────────────────────

// GET /job-contractors
export type GetJobContractorsRequest   = TypedQueryRequest<typeof JobContractorsQuerySchema>;
// POST /job-contractors
export type AssignContractorRequest    = TypedBodyRequest<typeof AssignContractorSchema>;
// PATCH /job-contractors/:jobContractorId
export type UpdateJobContractorRequest = TypedParamsBodyRequest<typeof JobContractorParamsSchema, typeof UpdateJobContractorSchema>;
// DELETE /job-contractors/:jobContractorId
export type DeleteJobContractorRequest = TypedParamsRequest<typeof JobContractorParamsSchema>;
