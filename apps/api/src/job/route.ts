import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { authenticateJWT } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validate.middleware';
import {
  JobParamsSchema, JobsQuerySchema,
  GetJobRequest, GetJobsRequest, CreateJobRequest,
  UpdateJobRequest, DeleteJobRequest,
  DiagnoseRequest,
  CreateJobSchema, UpdateJobSchema, DiagnoseSchema,
} from './schema';
import { EmailDraftSchema } from '@/ai/schema';
import { JobManager } from './models/JobManager';
import { JobContractorManager } from './models/JobContractorManager';
import { JobImageManager } from '@/ai/models/JobImageManager';
import { AIGenerationManager } from '@/ai/models/AIGenerationManager';
import { QuoteManager } from '@/quote/models/QuoteManager';
import { CommunicationManager } from '@/communication/models/CommunicationManager';
import { permit } from '@/permissions/permit';
import * as permissionService from '@/permissions/PermissionService';
import { HomeManager } from '@/home/models/HomeManager';
import { ForbiddenError } from '@/utils/errors';
import * as jobService from './service';
import * as aiService from '@/ai/service';
import * as integrationService from '@/integration/service';

export const jobRouter = Router();
jobRouter.use(authenticateJWT);

// List — homeId is an optional filter; permission checked inline when provided
jobRouter.get('/',
  validate(JobsQuerySchema, 'query'),
  async (req: GetJobsRequest, res: Response, next: NextFunction) => {
    try {
      const { userId, role } = req.user;
      const { homeId, ...filters } = req.query;
      if (homeId) {
        const allowed = await permissionService.check(HomeManager, userId, homeId);
        if (!allowed) return next(new ForbiddenError());
      }
      const jobs = await permissionService.list(JobManager, userId, role, homeId, filters);
      res.json({ data: jobs });
    } catch (err) { next(err); }
  },
);

// Create — homeId in body; permission checked inline before service call
jobRouter.post('/',
  validate(CreateJobSchema),
  async (req: CreateJobRequest, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.user;
      const allowed = await permissionService.check(HomeManager, userId, req.body.homeId);
      if (!allowed) return next(new ForbiddenError());
      const job = await jobService.createJob(req.body.homeId, userId, req.body);
      res.status(201).json({ data: job });
    } catch (err) { next(err); }
  },
);


// Single job — relation assembly via Promise.all, no service wrapper
jobRouter.get('/:jobId',
  validate(JobParamsSchema, 'params'),
  permit(JobManager, (req) => req.params.jobId),
  async (req: GetJobRequest, res: Response, next: NextFunction) => {
    try {
      const { jobId } = req.params;
      const [job, contractors, images, quotes, communications, aiGenerations] = await Promise.all([
        JobManager.findById(jobId),
        JobContractorManager.listForJob(jobId),
        JobImageManager.listForJob(jobId),
        QuoteManager.listForJob(jobId),
        CommunicationManager.listForJob(jobId),
        AIGenerationManager.listForJob(jobId),
      ]);
      res.json({ data: { ...job, contractors, images, quotes, communications, aiGenerations } });
    } catch (err) { next(err); }
  },
);

jobRouter.patch('/:jobId',
  validate(JobParamsSchema, 'params'),
  permit(JobManager, (req) => req.params.jobId),
  validate(UpdateJobSchema),
  async (req: UpdateJobRequest, res: Response, next: NextFunction) => {
    try {
      const job = await jobService.updateJob(req.params.jobId, req.body);
      res.json({ data: job });
    } catch (err) { next(err); }
  },
);

jobRouter.delete('/:jobId',
  validate(JobParamsSchema, 'params'),
  permit(JobManager, (req) => req.params.jobId),
  async (req: DeleteJobRequest, res: Response, next: NextFunction) => {
    try {
      await jobService.deleteJob(req.params.jobId);
      res.json({ data: { success: true } });
    } catch (err) { next(err); }
  },
);

// ─── AI diagnostic ────────────────────────────────────────────────────────────

jobRouter.post('/:jobId/diagnose/start',
  validate(JobParamsSchema, 'params'),
  permit(JobManager, (req) => req.params.jobId),
  async (req: GetJobRequest, res: Response, next: NextFunction) => {
    try {
      const result = await aiService.startDiagnose(req.params.jobId);
      res.json({ data: result });
    } catch (err) { next(err); }
  },
);

jobRouter.post('/:jobId/diagnose',
  validate(JobParamsSchema, 'params'),
  permit(JobManager, (req) => req.params.jobId),
  validate(DiagnoseSchema),
  async (req: DiagnoseRequest, res: Response, next: NextFunction) => {
    try {
      const result = await aiService.diagnoseJob(req.params.jobId, req.body.message);
      res.json({ data: result });
    } catch (err) { next(err); }
  },
);

// ─── Email ────────────────────────────────────────────────────────────────────

jobRouter.post('/:jobId/email-drafts',
  validate(JobParamsSchema, 'params'),
  permit(JobManager, (req) => req.params.jobId),
  validate(EmailDraftSchema),
  async (req: GetJobRequest, res: Response, next: NextFunction) => {
    try {
      const drafts = await aiService.draftEmail({ jobId: req.params.jobId, userId: req.user.userId, ...req.body });
      res.json({ data: drafts });
    } catch (err) { next(err); }
  },
);

jobRouter.post('/:jobId/send-email',
  validate(JobParamsSchema, 'params'),
  permit(JobManager, (req) => req.params.jobId),
  async (req: GetJobRequest, res: Response, next: NextFunction) => {
    try {
      const result = await integrationService.sendViaGmail({
        userId: req.user.userId,
        integrationId: req.body.integrationId,
        to: req.body.to,
        subject: req.body.subject,
        bodyText: req.body.bodyText,
        bodyHtml: req.body.bodyHtml,
        jobId: req.params.jobId,
        contractorId: req.body.contractorId,
      });
      res.json({ data: result });
    } catch (err) { next(err); }
  },
);
