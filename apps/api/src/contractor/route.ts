import { Router } from 'express';
import { authenticateJWT, requireRole } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validate.middleware';
import { permit } from '@/permissions/permit';
import { attachZipCodes, ContractorManager } from '@/contractor/models/ContractorManager';
import { BadRequestError } from '@/utils/errors';
import { CreateContractorSchema, UpdateContractorSchema } from './schema';
import { TradeCategory, UserRole } from '@thms/shared';
import * as contractorService from './service';

const router = Router();
router.use(authenticateJWT);

function stringList(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  const values = Array.isArray(value) ? value : [value];
  return values
    .flatMap((entry) => (typeof entry === 'string' ? entry.split(',') : []))
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function tradeCategoryList(value: unknown): TradeCategory[] | undefined {
  const values = stringList(value);
  if (values === undefined) return undefined;
  const allowed = new Set<string>(Object.values(TradeCategory));
  const invalid = values.find((value) => !allowed.has(value));
  if (invalid) throw new BadRequestError(`Invalid trade category: ${invalid}`);
  return values as TradeCategory[];
}

function rejectUnsupportedListFilters(query: Record<string, unknown>): void {
  if (query.category !== undefined) {
    throw new BadRequestError('Use tradeCategories as a list filter, not category');
  }
  if (query.zipCode !== undefined) {
    throw new BadRequestError('Use zipCodes as a list filter, not zipCode');
  }
}

/** GET / — global contractor list with optional filters; all filtering happens in SQL. */
router.get('/', async (req, res, next) => {
  try {
    const { search } = req.query as {
      search?: string;
    };
    rejectUnsupportedListFilters(req.query);
    const tradeCategories = tradeCategoryList(req.query.tradeCategories);
    const zipCodes = stringList(req.query.zipCodes);

    const bareContractors = await ContractorManager.filter({
      isGlobal: true,
      search,
      tradeCategories,
      zipCodes,
    });

    const result = await attachZipCodes(bareContractors);

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
