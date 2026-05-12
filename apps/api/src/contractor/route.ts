import { Router } from 'express';
import { authenticateJWT, AuthenticatedRequest, requireRole } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validate.middleware';
import { permit } from '@/permissions/permit';
import { TradeCategory, UserRole } from '@thms/shared';
import { ContractorManager } from './models/ContractorManager';
import { CreateContractorSchema, UpdateContractorSchema } from './schema';
import * as contractorService from './service';

const router = Router();
router.use(authenticateJWT);

router.get('/', async (req, res, next) => {
  try {
    const { search, zipCode, category } = req.query as {
      search?: string;
      zipCode?: string;
      category?: TradeCategory;
    };

    const result = await ContractorManager.query()
      .filterZipCode(zipCode)
      .filterCategory(category)
      .search(search)
      .all();
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  requireRole(UserRole.ADMIN),
  validate(CreateContractorSchema),
  async (req, res, next) => {
    try {
      const contractor = await contractorService.createContractor(req.body);
      res.status(201).json({ data: contractor });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/:contractorId',
  permit(ContractorManager, (req) => req.params.contractorId),
  async (req, res, next) => {
    try {
      const contractor = await contractorService.getContractor(req.params.contractorId);
      res.json({ data: contractor });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/:contractorId/jobs',
  permit(ContractorManager, (req) => req.params.contractorId),
  async (req, res, next) => {
    try {
      const history = await contractorService.getContractorJobHistory(req.params.contractorId);
      res.json({ data: history });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/:contractorId',
  requireRole(UserRole.ADMIN),
  permit(ContractorManager, (req) => req.params.contractorId),
  validate(UpdateContractorSchema),
  async (req, res, next) => {
    try {
      const contractor = await contractorService.updateContractor(
        req.params.contractorId,
        req.body
      );
      res.json({ data: contractor });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/:contractorId',
  requireRole(UserRole.ADMIN),
  permit(ContractorManager, (req) => req.params.contractorId),
  async (req, res, next) => {
    try {
      await contractorService.deleteContractor(req.params.contractorId);
      res.json({ data: { success: true } });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
