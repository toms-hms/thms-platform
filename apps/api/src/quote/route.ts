import { Router } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { UpdateQuoteSchema } from './schema';
import * as quoteService from './service';

const router = Router();
router.use(authenticateJWT);

// Standalone quote operations (mounted at /quotes)
router.patch('/:quoteId', validate(UpdateQuoteSchema), async (req, res, next) => {
  try {
    const quote = await quoteService.updateQuote(req.params.quoteId, req.body);
    res.json({ data: quote });
  } catch (err) { next(err); }
});

router.delete('/:quoteId', async (req, res, next) => {
  try {
    await quoteService.deleteQuote(req.params.quoteId);
    res.json({ data: { success: true } });
  } catch (err) { next(err); }
});

export default router;
