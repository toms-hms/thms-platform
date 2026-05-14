import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { authenticateJWT } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validate.middleware';
import { CommunicationRequest, CommunicationSchema, UpdateCommunicationSchema } from './schema';
import { CommunicationManager } from './models/CommunicationManager';
import * as communicationService from './service';

const router = Router();
router.use(authenticateJWT);

router.get('/:communicationId',
  validate(CommunicationSchema, 'params'),
  async (req: CommunicationRequest, res: Response, next: NextFunction) => {
    try {
      const comm = await CommunicationManager.findById(req.params.communicationId);
      res.json({ data: comm });
    } catch (err) { next(err); }
  },
);

router.patch('/:communicationId',
  validate(CommunicationSchema, 'params'),
  validate(UpdateCommunicationSchema),
  async (req: CommunicationRequest, res: Response, next: NextFunction) => {
    try {
      const comm = await communicationService.updateCommunication(req.params.communicationId, req.body);
      res.json({ data: comm });
    } catch (err) { next(err); }
  },
);

export default router;
