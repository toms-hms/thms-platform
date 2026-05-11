import { Router } from 'express';
import { authenticateJWT, AuthenticatedRequest, requireRole } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validate.middleware';
import { CreateContractorSchema, UpdateContractorSchema } from './schema';
import { attachZipCodes, ContractorManager } from '@/contractor/models/ContractorManager';
import { permit } from '@/permissions/permit';
import { PermissionService } from '@/permissions/PermissionService';
import { HomeManager } from '@/home/models/HomeManager';
import { NotFoundError } from '@/utils/errors';
import * as contractorService from './service';
import { TradeCategory, UserRole } from '@thms/shared';

const router = Router();
router.use(authenticateJWT);

router.get('/', async (req, res, next) => {
  try {
    const { userId, role } = (req as unknown as AuthenticatedRequest).user;
    const { search, category, homeZipFilter } = req.query as { search?: string; category?: string; homeZipFilter?: string };
    const bareContractors = await PermissionService.list(ContractorManager, userId, role);

    // Only attach zip codes when the homeZipFilter requires them — avoids the extra query otherwise
    const contractors = homeZipFilter === 'true'
      ? await attachZipCodes(bareContractors)
      : bareContractors;

    const homeZipCodes = homeZipFilter === 'true'
      ? (await PermissionService.list(HomeManager, userId, role)).map((home: { zipCode: string }) => home.zipCode)
      : [];

    const filtered = contractors.filter((c) => {
      if (search) {
        const s = search.toLowerCase();
        if (!c.name.toLowerCase().includes(s) && !c.companyName?.toLowerCase().includes(s) && !c.email?.toLowerCase().includes(s)) return false;
      }
      if (category && !c.categories.includes(category as TradeCategory)) return false;
      if (homeZipFilter === 'true' && !('zipCodes' in c && (c.zipCodes as string[]).some((z) => homeZipCodes.includes(z)))) return false;
      return true;
    });
    res.json({ data: filtered });
  } catch (err) { next(err); }
});

router.post('/', requireRole(UserRole.ADMIN), validate(CreateContractorSchema), async (req, res, next) => {
  try {
    const contractor = await contractorService.createContractor(req.body);
    res.status(201).json({ data: contractor });
  } catch (err) { next(err); }
});

router.get('/:contractorId',
  permit(ContractorManager, (req) => req.params.contractorId),
  async (req, res, next) => {
    try {
      const contractor = await ContractorManager.filterById(req.params.contractorId);
      if (!contractor) throw new NotFoundError('Contractor');
      const [withZips] = await attachZipCodes([contractor]);
      res.json({ data: withZips });
    } catch (err) { next(err); }
  }
);

router.get('/:contractorId/jobs',
  permit(ContractorManager, (req) => req.params.contractorId),
  async (req, res, next) => {
    try {
      const contractor = await ContractorManager.filterById(req.params.contractorId);
      if (!contractor) throw new NotFoundError('Contractor');
      const history = await ContractorManager.listJobHistory(req.params.contractorId);
      res.json({ data: history });
    } catch (err) { next(err); }
  }
);

router.post('/:contractorId/promote',
  requireRole(UserRole.ADMIN),
  async (req, res, next) => {
    try {
      const contractor = await contractorService.promoteContractor(req.params.contractorId);
      res.json({ data: contractor });
    } catch (err) { next(err); }
  }
);

router.patch('/:contractorId',
  requireRole(UserRole.ADMIN),
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
  requireRole(UserRole.ADMIN),
  permit(ContractorManager, (req) => req.params.contractorId),
  async (req, res, next) => {
    try {
      await contractorService.deleteContractor(req.params.contractorId);
      res.json({ data: { success: true } });
    } catch (err) { next(err); }
  }
);

export default router;
