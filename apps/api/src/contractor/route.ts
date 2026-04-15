import { Router } from 'express';
import { authenticateJWT, AuthenticatedRequest, requireRole } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { CreateContractorSchema, UpdateContractorSchema } from './schema';
import { ContractorManager } from './models/ContractorManager';
import { permit } from '../permissions/permit';
import { PermissionService } from '../permissions/PermissionService';
import * as contractorService from './service';

const router = Router();
router.use(authenticateJWT);

router.get('/', async (req, res, next) => {
  try {
    const { userId, role } = (req as unknown as AuthenticatedRequest).user;
    const contractors = await PermissionService.list(ContractorManager, userId, role);
    const { search, category } = req.query as { search?: string; category?: string };
    const filtered = contractors.filter((c) => {
      if (search) {
        const s = search.toLowerCase();
        if (!c.name.toLowerCase().includes(s) && !c.companyName?.toLowerCase().includes(s) && !c.email?.toLowerCase().includes(s)) return false;
      }
      if (category && c.category !== category) return false;
      return true;
    });
    res.json({ data: filtered });
  } catch (err) { next(err); }
});

router.post('/', requireRole('ADMIN'), validate(CreateContractorSchema), async (req, res, next) => {
  try {
    const contractor = await contractorService.createContractor(req.body);
    res.status(201).json({ data: contractor });
  } catch (err) { next(err); }
});

router.get('/:contractorId',
  permit(ContractorManager, (req) => req.params.contractorId),
  async (req, res, next) => {
    try {
      const contractor = await contractorService.getContractor(req.params.contractorId);
      res.json({ data: contractor });
    } catch (err) { next(err); }
  }
);

router.patch('/:contractorId',
  requireRole('ADMIN'),
  permit(ContractorManager, (req) => req.params.contractorId),
  validate(UpdateContractorSchema),
  async (req, res, next) => {
    try {
      const contractor = await contractorService.updateContractor(req.params.contractorId, req.body);
      res.json({ data: contractor });
    } catch (err) { next(err); }
  }
);

router.delete('/:contractorId',
  requireRole('ADMIN'),
  permit(ContractorManager, (req) => req.params.contractorId),
  async (req, res, next) => {
    try {
      await contractorService.deleteContractor(req.params.contractorId);
      res.json({ data: { success: true } });
    } catch (err) { next(err); }
  }
);

export default router;
