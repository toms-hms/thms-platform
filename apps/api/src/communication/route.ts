import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { authenticateJWT } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validate.middleware';
import { CommunicationParamsSchema, GetCommunicationRequest, UpdateCommunicationSchema } from './schema';
import { CommunicationManager } from './models/CommunicationManager';
import * as communicationService from './service';

const router = Router();
router.use(authenticateJWT);

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
  async (req: GetCommunicationRequest, res: Response, next: NextFunction) => {
    try {
      const comm = await communicationService.updateCommunication(req.params.communicationId, req.body);
      res.json({ data: comm });
    } catch (err) { next(err); }
  },
);

export default router;
