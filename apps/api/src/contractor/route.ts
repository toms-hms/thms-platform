import { Router } from 'express';
import { authenticateJWT, AuthenticatedRequest, requireRole } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validate.middleware';
import { permit } from '@/permissions/permit';
import { PermissionService } from '@/permissions/PermissionService';
import { HomeManager } from '@/home/models/HomeManager';
import { attachZipCodes, ContractorManager } from '@/contractor/models/ContractorManager';
import { CreateContractorSchema, UpdateContractorSchema } from './schema';
import { TradeCategory, UserRole } from '@thms/shared';
import * as contractorService from './service';

const router = Router();
router.use(authenticateJWT);

/** GET / — global contractor list with optional filters; all filtering happens in SQL. */
router.get('/', async (req, res, next) => {
  try {
    const { userId, role } = (req as unknown as AuthenticatedRequest).user;
    const { search, category, zipCode, homeZipFilter } = req.query as {
      search?: string;
      category?: TradeCategory;
      zipCode?: string;
      homeZipFilter?: string;
    };

    // When homeZipFilter=true, fetch the user's home zip codes and pass them as a filter.
    const homeZipCodes = homeZipFilter === 'true'
      ? (await PermissionService.list(HomeManager, userId, role)).map((h: { zipCode: string }) => h.zipCode)
      : undefined;

    const bareContractors = await ContractorManager.filter({
      isGlobal: true,
      search,
      category,
      zipCode,
      zipCodes: homeZipCodes,
    });

    // Attach zip codes only when the caller has requested zip-based filtering and may want them in the response.
    const result = homeZipFilter === 'true'
      ? await attachZipCodes(bareContractors)
      : bareContractors;

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
      const [withZips] = await attachZipCodes([contractor]);
      res.json({ data: withZips });
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
      await contractorService.getContractor(req.params.contractorId);
      const history = await ContractorManager.listJobHistory(req.params.contractorId);
      res.json({ data: history });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/:contractorId/promote',
  requireRole(UserRole.ADMIN),
  async (req, res, next) => {
    try {
      const contractor = await contractorService.promoteContractor(req.params.contractorId);
      res.json({ data: contractor });
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
