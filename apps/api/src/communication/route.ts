import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { authenticateJWT } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validate.middleware';
import {
  CommunicationParamsSchema, CommunicationsQuerySchema,
  GetCommunicationsRequest, GetCommunicationRequest,
  UpdateCommunicationRequest, UpdateCommunicationSchema,
} from './schema';
import { CommunicationManager } from './models/CommunicationManager';
import { JobManager } from '@/job/models/JobManager';
import * as permissionService from '@/permissions/PermissionService';
import { ForbiddenError } from '@/utils/errors';
import * as communicationService from './service';

const router = Router();
router.use(authenticateJWT);

// GET /communications?jobId=X — list communications for a job
router.get('/',
  validate(CommunicationsQuerySchema, 'query'),
  async (req: GetCommunicationsRequest, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.user;
      const { jobId, contractorId, needsReview, direction } = req.query;
      if (!jobId) return res.json({ data: [] });
      const allowed = await permissionService.check(JobManager, userId, jobId);
      if (!allowed) return next(new ForbiddenError());
      const comms = await CommunicationManager.listForJob(jobId, {
        contractorId,
        needsReview: needsReview === 'true' ? true : needsReview === 'false' ? false : undefined,
        direction,
      });
      res.json({ data: comms });
    } catch (err) { next(err); }
  },
);

router.get('/:communicationId',
  validate(CommunicationParamsSchema, 'params'),
  async (req: GetCommunicationRequest, res: Response, next: NextFunction) => {
    try {
      const comm = await CommunicationManager.findById(req.params.communicationId);
      res.json({ data: comm });
    } catch (err) { next(err); }
  },
);

router.patch('/:communicationId',
  validate(CommunicationParamsSchema, 'params'),
  validate(UpdateCommunicationSchema),
  async (req: UpdateCommunicationRequest, res: Response, next: NextFunction) => {
    try {
      const comm = await communicationService.updateCommunication(req.params.communicationId, req.body);
      res.json({ data: comm });
    } catch (err) { next(err); }
  },
);

export default router;
