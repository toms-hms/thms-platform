import { Router } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  CreateJobSchema,
  UpdateJobSchema,
  AssignContractorSchema,
  UpdateJobContractorSchema,
} from '../schemas/jobs.schema';
import { CreateQuoteSchema, UpdateQuoteSchema } from '../schemas/quotes.schema';
import { CreateAIGenerationSchema, EmailDraftSchema } from '../schemas/ai.schema';
import * as jobsService from '../services/jobs.service';
import * as uploadService from '../services/upload.service';
import * as quotesService from '../services/quotes.service';
import * as communicationsService from '../services/communications.service';
import * as aiService from '../services/ai.service';

const router = Router({ mergeParams: true });

router.use(authenticateJWT);

// Jobs CRUD
router.get('/', async (req, res, next) => {
  try {
    const jobs = await jobsService.listJobs(
      (req.params as any).homeId,
      (req as unknown as AuthenticatedRequest).user.userId,
      { status: req.query.status as string, category: req.query.category as string }
    );
    res.json({ data: jobs });
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(CreateJobSchema), async (req, res, next) => {
  try {
    const job = await jobsService.createJob(
      (req.params as any).homeId,
      (req as unknown as AuthenticatedRequest).user.userId,
      req.body
    );
    res.status(201).json({ data: job });
  } catch (err) {
    next(err);
  }
});

export default router;
