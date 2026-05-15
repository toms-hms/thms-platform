import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { authenticateJWT, requireRole } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validate.middleware';
import { permit } from '@/permissions/permit';
import { attachZipCodes, ContractorManager } from '@/contractor/models/ContractorManager';
import {
  ContractorParamsSchema, ContractorsQuerySchema,
  GetContractorsRequest, GetContractorRequest, GetContractorJobsRequest,
  CreateContractorRequest, UpdateContractorRequest,
  DeleteContractorRequest, PromoteContractorRequest,
  CreateContractorSchema, UpdateContractorSchema,
} from './schema';
import { UserRole } from '@/auth/models/User';
import * as contractorService from './service';

const router = Router();
router.use(authenticateJWT);

router.get('/',
  validate(ContractorsQuerySchema, 'query'),
  async (req: GetContractorsRequest, res: Response, next: NextFunction) => {
    try {
      const bareContractors = await ContractorManager.filter({ ...req.query, isGlobal: true });
      const result = await attachZipCodes(bareContractors);
      res.json({ data: result });
    } catch (err) { next(err); }
  },
);

router.post('/',
  requireRole(UserRole.ADMIN),
  validate(CreateContractorSchema),
  async (req: CreateContractorRequest, res: Response, next: NextFunction) => {
    try {
      const contractor = await contractorService.createContractor(req.body);
      res.status(201).json({ data: contractor });
    } catch (err) { next(err); }
  },
);

router.get('/:contractorId',
  validate(ContractorParamsSchema, 'params'),
  permit(ContractorManager, (req) => req.params.contractorId),
  async (req: GetContractorRequest, res: Response, next: NextFunction) => {
    try {
      const contractor = await ContractorManager.get({ id: req.params.contractorId });
      const [withZips] = await attachZipCodes([contractor]);
      res.json({ data: withZips });
    } catch (err) { next(err); }
  },
);

router.get('/:contractorId/jobs',
  validate(ContractorParamsSchema, 'params'),
  permit(ContractorManager, (req) => req.params.contractorId),
  async (req: GetContractorJobsRequest, res: Response, next: NextFunction) => {
    try {
      const history = await ContractorManager.listJobHistory(req.params.contractorId);
      res.json({ data: history });
    } catch (err) { next(err); }
  },
);

router.post('/:contractorId/promote',
  validate(ContractorParamsSchema, 'params'),
  requireRole(UserRole.ADMIN),
  async (req: PromoteContractorRequest, res: Response, next: NextFunction) => {
    try {
      const contractor = await contractorService.promoteContractor(req.params.contractorId);
      res.json({ data: contractor });
    } catch (err) { next(err); }
  },
);

router.patch('/:contractorId',
  validate(ContractorParamsSchema, 'params'),
  requireRole(UserRole.ADMIN),
  permit(ContractorManager, (req) => req.params.contractorId),
  validate(UpdateContractorSchema),
  async (req: UpdateContractorRequest, res: Response, next: NextFunction) => {
    try {
      const contractor = await contractorService.updateContractor(req.params.contractorId, req.body);
      res.json({ data: contractor });
    } catch (err) { next(err); }
  },
);

router.delete('/:contractorId',
  validate(ContractorParamsSchema, 'params'),
  requireRole(UserRole.ADMIN),
  permit(ContractorManager, (req) => req.params.contractorId),
  async (req: DeleteContractorRequest, res: Response, next: NextFunction) => {
    try {
      await contractorService.deleteContractor(req.params.contractorId);
      res.json({ data: { success: true } });
    } catch (err) { next(err); }
  },
);

export default router;
