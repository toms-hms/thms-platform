import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { authenticateJWT } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validate.middleware';
import {
  JobContractorParamsSchema, JobContractorsQuerySchema,
  AssignContractorSchema, UpdateJobContractorSchema,
  GetJobContractorsRequest, AssignContractorRequest,
  UpdateJobContractorRequest, DeleteJobContractorRequest,
} from './schema';
import { JobContractorManager } from '@/job/models/JobContractorManager';
import { JobManager } from '@/job/models/JobManager';
import { permit } from '@/permissions/permit';
import { PermissionService } from '@/permissions/PermissionService';
import { ForbiddenError } from '@/utils/errors';
import * as jobService from '@/job/service';

export const jobContractorRouter = Router();
jobContractorRouter.use(authenticateJWT);

// GET /job-contractors?jobId=X — list for a job
jobContractorRouter.get('/',
  validate(JobContractorsQuerySchema, 'query'),
  async (req: GetJobContractorsRequest, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.user;
      const { jobId } = req.query;
      if (!jobId) return res.json({ data: [] });
      const allowed = await PermissionService.check(JobManager, userId, jobId);
      if (!allowed) return next(new ForbiddenError());
      const jcs = await JobContractorManager.listForJob(jobId);
      res.json({ data: jcs });
    } catch (err) { next(err); }
  },
);

// POST /job-contractors — assign contractor to job; jobId in body
jobContractorRouter.post('/',
  validate(AssignContractorSchema),
  async (req: AssignContractorRequest, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.user;
      const allowed = await PermissionService.check(JobManager, userId, req.body.jobId);
      if (!allowed) return next(new ForbiddenError());
      const jc = await jobService.assignContractor(req.body.jobId, req.body.contractorId, req.body.notes);
      res.status(201).json({ data: jc });
    } catch (err) { next(err); }
  },
);

// PATCH /job-contractors/:jobContractorId
jobContractorRouter.patch('/:jobContractorId',
  validate(JobContractorParamsSchema, 'params'),
  permit(JobContractorManager, (req) => req.params.jobContractorId),
  validate(UpdateJobContractorSchema),
  async (req: UpdateJobContractorRequest, res: Response, next: NextFunction) => {
    try {
      const jc = await jobService.updateJobContractorStatus(req.params.jobContractorId, req.body.status, req.body.notes);
      res.json({ data: jc });
    } catch (err) { next(err); }
  },
);

// DELETE /job-contractors/:jobContractorId
jobContractorRouter.delete('/:jobContractorId',
  validate(JobContractorParamsSchema, 'params'),
  permit(JobContractorManager, (req) => req.params.jobContractorId),
  async (req: DeleteJobContractorRequest, res: Response, next: NextFunction) => {
    try {
      await jobService.removeContractorFromJob(req.params.jobContractorId);
      res.json({ data: { success: true } });
    } catch (err) { next(err); }
  },
);
