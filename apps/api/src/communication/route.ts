import { Router } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { UpdateCommunicationSchema } from './schema';
import * as communicationService from './service';

const router = Router();
router.use(authenticateJWT);

router.get('/:communicationId', async (req, res, next) => {
  try {
    const comm = await communicationService.getCommunication(req.params.communicationId);
    res.json({ data: comm });
  } catch (err) { next(err); }
});

router.patch('/:communicationId', validate(UpdateCommunicationSchema), async (req, res, next) => {
  try {
    const comm = await communicationService.updateCommunication(req.params.communicationId, req.body);
    res.json({ data: comm });
  } catch (err) { next(err); }
});

export default router;
