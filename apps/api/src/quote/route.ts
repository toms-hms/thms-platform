import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { authenticateJWT } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validate.middleware';
import { QuoteRequest, QuoteSchema, UpdateQuoteSchema } from './schema';
import * as quoteService from './service';

const router = Router();
router.use(authenticateJWT);

router.patch('/:quoteId',
  validate(QuoteSchema, 'params'),
  validate(UpdateQuoteSchema),
  async (req: QuoteRequest, res: Response, next: NextFunction) => {
    try {
      const quote = await quoteService.updateQuote(req.params.quoteId, req.body);
      res.json({ data: quote });
    } catch (err) { next(err); }
  },
);

router.delete('/:quoteId',
  validate(QuoteSchema, 'params'),
  async (req: QuoteRequest, res: Response, next: NextFunction) => {
    try {
      await quoteService.deleteQuote(req.params.quoteId);
      res.json({ data: { success: true } });
    } catch (err) { next(err); }
  },
);

export default router;
