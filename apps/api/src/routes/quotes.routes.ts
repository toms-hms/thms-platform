import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { UpdateQuoteSchema } from '../schemas/quotes.schema';
import * as quotesService from '../services/quotes.service';

const router = Router();

router.use(authenticateJWT);

router.patch('/:quoteId', validate(UpdateQuoteSchema), async (req, res, next) => {
  try {
    const quote = await quotesService.updateQuote(req.params.quoteId, req.body);
    res.json({ data: quote });
  } catch (err) {
    next(err);
  }
});

router.delete('/:quoteId', async (req, res, next) => {
  try {
    await quotesService.deleteQuote(req.params.quoteId);
    res.json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
});

export default router;
