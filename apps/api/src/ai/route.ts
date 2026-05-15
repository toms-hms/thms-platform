import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { authenticateJWT } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validate.middleware';
import {
  AIGenerationsQuerySchema, CreateAIGenerationSchema,
  GetAIGenerationsRequest, CreateAIGenerationRequest,
} from './schema';
import { AIGenerationManager } from './models/AIGenerationManager';
import { JobManager } from '@/job/models/JobManager';
import { PermissionService } from '@/permissions/PermissionService';
import { ForbiddenError } from '@/utils/errors';
import * as aiService from './service';

const aiGenerationRouter = Router();
aiGenerationRouter.use(authenticateJWT);

// GET /ai-generations?jobId=X — list generations for a job
aiGenerationRouter.get('/',
  validate(AIGenerationsQuerySchema, 'query'),
  async (req: GetAIGenerationsRequest, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.user;
      const { jobId } = req.query;
      if (!jobId) return res.json({ data: [] });
      const allowed = await PermissionService.check(JobManager, userId, jobId);
      if (!allowed) return next(new ForbiddenError());
      const gens = await AIGenerationManager.listForJob(jobId);
      res.json({ data: gens });
    } catch (err) { next(err); }
  },
);

// POST /ai-generations — create a generation; jobId in body
aiGenerationRouter.post('/',
  validate(CreateAIGenerationSchema),
  async (req: CreateAIGenerationRequest, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.user;
      const allowed = await PermissionService.check(JobManager, userId, req.body.jobId);
      if (!allowed) return next(new ForbiddenError());
      const gen = await aiService.generateImage({
        jobId:         req.body.jobId,
        userId,
        sourceImageId: req.body.sourceImageId,
        prompt:        req.body.prompt,
        provider:      req.body.provider || 'openai',
        metadata:      req.body.metadata,
      });
      res.status(201).json({ data: gen });
    } catch (err) { next(err); }
  },
);

export default aiGenerationRouter;
