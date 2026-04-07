import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { UpdateCommunicationSchema } from '../schemas/communications.schema';
import * as communicationsService from '../services/communications.service';

const router = Router();

router.use(authenticateJWT);

router.get('/:communicationId', async (req, res, next) => {
  try {
    const comm = await communicationsService.getCommunication(req.params.communicationId);
    res.json({ data: comm });
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/:communicationId',
  validate(UpdateCommunicationSchema),
  async (req, res, next) => {
    try {
      const comm = await communicationsService.updateCommunication(
        req.params.communicationId,
        req.body
      );
      res.json({ data: comm });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
