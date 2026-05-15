import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { authenticateJWT } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validate.middleware';
import {
  QuoteParamsSchema, QuotesQuerySchema, CreateQuoteSchema,
  GetQuotesRequest, CreateQuoteRequest,
  UpdateQuoteRequest, DeleteQuoteRequest, UpdateQuoteSchema,
} from './schema';
import { QuoteManager } from './models/QuoteManager';
import { JobManager } from '@/job/models/JobManager';
import { PermissionService } from '@/permissions/PermissionService';
import { ForbiddenError } from '@/utils/errors';
import * as quoteService from './service';

const router = Router();
router.use(authenticateJWT);

// GET /quotes?jobId=X — list quotes for a job
router.get('/',
  validate(QuotesQuerySchema, 'query'),
  async (req: GetQuotesRequest, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.user;
      const { jobId } = req.query;
      if (!jobId) return res.json({ data: [] });
      const allowed = await PermissionService.check(JobManager, userId, jobId);
      if (!allowed) return next(new ForbiddenError());
      const quotes = await QuoteManager.listForJob(jobId);
      res.json({ data: quotes });
    } catch (err) { next(err); }
  },
);

// POST /quotes — create a quote; jobId in body
router.post('/',
  validate(CreateQuoteSchema),
  async (req: CreateQuoteRequest, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.user;
      const allowed = await PermissionService.check(JobManager, userId, req.body.jobId);
      if (!allowed) return next(new ForbiddenError());
      const { jobId, ...data } = req.body;
      const quote = await quoteService.createQuote(jobId, data);
      res.status(201).json({ data: quote });
    } catch (err) { next(err); }
  },
);

router.patch('/:quoteId',
  validate(QuoteParamsSchema, 'params'),
  validate(UpdateQuoteSchema),
  async (req: UpdateQuoteRequest, res: Response, next: NextFunction) => {
    try {
      const quote = await quoteService.updateQuote(req.params.quoteId, req.body);
      res.json({ data: quote });
    } catch (err) { next(err); }
  },
);

router.delete('/:quoteId',
  validate(QuoteParamsSchema, 'params'),
  async (req: DeleteQuoteRequest, res: Response, next: NextFunction) => {
    try {
      await quoteService.deleteQuote(req.params.quoteId);
      res.json({ data: { success: true } });
    } catch (err) { next(err); }
  },
);

export default router;
