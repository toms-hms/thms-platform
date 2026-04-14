import { Router } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { CreateContractorSchema, UpdateContractorSchema } from './schema';
import * as contractorService from './service';

const router = Router();
router.use(authenticateJWT);

router.get('/', async (req, res, next) => {
  try {
    const contractors = await contractorService.listContractors(
      (req as unknown as AuthenticatedRequest).user.userId,
      { search: req.query.search as string, category: req.query.category as string }
    );
    res.json({ data: contractors });
  } catch (err) { next(err); }
});

router.post('/', validate(CreateContractorSchema), async (req, res, next) => {
  try {
    const contractor = await contractorService.createContractor(
      (req as unknown as AuthenticatedRequest).user.userId, req.body
    );
    res.status(201).json({ data: contractor });
  } catch (err) { next(err); }
});

router.get('/:contractorId', async (req, res, next) => {
  try {
    const contractor = await contractorService.getContractor(
      req.params.contractorId, (req as unknown as AuthenticatedRequest).user.userId
    );
    res.json({ data: contractor });
  } catch (err) { next(err); }
});

router.patch('/:contractorId', validate(UpdateContractorSchema), async (req, res, next) => {
  try {
    const contractor = await contractorService.updateContractor(
      req.params.contractorId, (req as unknown as AuthenticatedRequest).user.userId, req.body
    );
    res.json({ data: contractor });
  } catch (err) { next(err); }
});

router.delete('/:contractorId', async (req, res, next) => {
  try {
    await contractorService.deleteContractor(
      req.params.contractorId, (req as unknown as AuthenticatedRequest).user.userId
    );
    res.json({ data: { success: true } });
  } catch (err) { next(err); }
});

export default router;
