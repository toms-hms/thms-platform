import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { authenticateJWT } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validate.middleware';
import {
  HomeJobsRequest,
  JobRequest, JobsSchema,
  CreateJobSchema, UpdateJobSchema,
  AssignContractorSchema, UpdateJobContractorSchema,
  DiagnoseSchema,
} from './schema';
import { CreateQuoteSchema } from '@/quote/schema';
import { CreateAIGenerationSchema, EmailDraftSchema } from '@/ai/schema';
import { JobManager } from './models/JobManager';
import { JobContractorManager } from './models/JobContractorManager';
import { JobImageManager } from '@/ai/models/JobImageManager';
import { AIGenerationManager } from '@/ai/models/AIGenerationManager';
import { QuoteManager } from '@/quote/models/QuoteManager';
import { CommunicationManager } from '@/communication/models/CommunicationManager';
import { permit } from '@/permissions/permit';
import { PermissionService } from '@/permissions/PermissionService';
import { HomeManager } from '@/home/models/HomeManager';
import * as jobService from './service';
import * as uploadService from '@/upload/service';
import * as quoteService from '@/quote/service';
import * as aiService from '@/ai/service';
import * as integrationService from '@/integration/service';

// Mounted at /homes/:homeId/jobs — mergeParams: true so :homeId is visible
export const homeJobRouter = Router({ mergeParams: true });
homeJobRouter.use(authenticateJWT);

homeJobRouter.get('/',
  permit(HomeManager, (req) => req.params.homeId),
  validate(JobsSchema, 'query'),
  async (req: HomeJobsRequest, res: Response, next: NextFunction) => {
    try {
      const { userId, role } = req.user;
      const jobs = await PermissionService.list(JobManager, userId, role, req.params.homeId, req.query);
      res.json({ data: jobs });
    } catch (err) { next(err); }
  },
);

homeJobRouter.post('/',
  permit(HomeManager, (req) => req.params.homeId),
  validate(CreateJobSchema),
  async (req: HomeJobsRequest, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.user;
      const job = await jobService.createJob(req.params.homeId, userId, req.body);
      res.status(201).json({ data: job });
    } catch (err) { next(err); }
  },
);

// Mounted at /jobs
export const jobRouter = Router();
jobRouter.use(authenticateJWT);

jobRouter.get('/:jobId',
  permit(JobManager, (req) => req.params.jobId),
  async (req: JobRequest, res: Response, next: NextFunction) => {
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
  permit(JobManager, (req) => req.params.jobId),
  validate(UpdateJobSchema),
  async (req: JobRequest, res: Response, next: NextFunction) => {
    try {
      const job = await jobService.updateJob(req.params.jobId, req.body);
      res.json({ data: job });
    } catch (err) { next(err); }
  },
);

jobRouter.delete('/:jobId',
  permit(JobManager, (req) => req.params.jobId),
  async (req: JobRequest, res: Response, next: NextFunction) => {
    try {
      await jobService.deleteJob(req.params.jobId);
      res.json({ data: { success: true } });
    } catch (err) { next(err); }
  },
);

// Contractors
jobRouter.get('/:jobId/contractors',
  permit(JobManager, (req) => req.params.jobId),
  async (req: JobRequest, res: Response, next: NextFunction) => {
    try {
      const jcs = await JobContractorManager.listForJob(req.params.jobId);
      res.json({ data: jcs });
    } catch (err) { next(err); }
  },
);

jobRouter.post('/:jobId/contractors',
  permit(JobManager, (req) => req.params.jobId),
  validate(AssignContractorSchema),
  async (req: JobRequest, res: Response, next: NextFunction) => {
    try {
      const jc = await jobService.assignContractor(req.params.jobId, req.body.contractorId, req.body.notes);
      res.status(201).json({ data: jc });
    } catch (err) { next(err); }
  },
);

jobRouter.patch('/:jobId/contractors/:jobContractorId',
  permit(JobContractorManager, (req) => req.params.jobContractorId),
  validate(UpdateJobContractorSchema),
  async (req: JobRequest, res: Response, next: NextFunction) => {
    try {
      const jc = await jobService.updateJobContractorStatus(req.params.jobContractorId, req.body.status, req.body.notes);
      res.json({ data: jc });
    } catch (err) { next(err); }
  },
);

jobRouter.delete('/:jobId/contractors/:jobContractorId',
  permit(JobContractorManager, (req) => req.params.jobContractorId),
  async (req: JobRequest, res: Response, next: NextFunction) => {
    try {
      await jobService.removeContractorFromJob(req.params.jobContractorId);
      res.json({ data: { success: true } });
    } catch (err) { next(err); }
  },
);

// Images
jobRouter.get('/:jobId/images',
  permit(JobManager, (req) => req.params.jobId),
  async (req: JobRequest, res: Response, next: NextFunction) => {
    try {
      const images = await JobImageManager.listForJob(req.params.jobId);
      const withUrls = await Promise.all(images.map(async (img) => ({ ...img, url: await uploadService.getDownloadUrl(img.storageKey) })));
      res.json({ data: withUrls });
    } catch (err) { next(err); }
  },
);

jobRouter.post('/:jobId/images/upload-url',
  permit(JobManager, (req) => req.params.jobId),
  async (req: JobRequest, res: Response, next: NextFunction) => {
    try {
      const { fileName, contentType, kind } = req.body;
      const result = await uploadService.getUploadUrl(req.params.jobId, req.user.userId, fileName, contentType, kind);
      res.json({ data: result });
    } catch (err) { next(err); }
  },
);

jobRouter.post('/:jobId/images/confirm',
  permit(JobManager, (req) => req.params.jobId),
  async (req: JobRequest, res: Response, next: NextFunction) => {
    try {
      const image = await uploadService.confirmUpload({
        jobId: req.params.jobId,
        userId: req.user.userId,
        key: req.body.key,
        kind: req.body.kind || 'SOURCE',
        label: req.body.label,
      });
      res.status(201).json({ data: image });
    } catch (err) { next(err); }
  },
);

jobRouter.delete('/:jobId/images/:imageId',
  permit(JobManager, (req) => req.params.jobId),
  async (req: JobRequest, res: Response, next: NextFunction) => {
    try {
      await uploadService.deleteJobImage(req.params.imageId, req.user.userId);
      res.json({ data: { success: true } });
    } catch (err) { next(err); }
  },
);

// Quotes
jobRouter.get('/:jobId/quotes',
  permit(JobManager, (req) => req.params.jobId),
  async (req: JobRequest, res: Response, next: NextFunction) => {
    try {
      const quotes = await QuoteManager.listForJob(req.params.jobId);
      res.json({ data: quotes });
    } catch (err) { next(err); }
  },
);

jobRouter.post('/:jobId/quotes',
  permit(JobManager, (req) => req.params.jobId),
  validate(CreateQuoteSchema),
  async (req: JobRequest, res: Response, next: NextFunction) => {
    try {
      const quote = await quoteService.createQuote(req.params.jobId, req.body);
      res.status(201).json({ data: quote });
    } catch (err) { next(err); }
  },
);

// Communications
jobRouter.get('/:jobId/communications',
  permit(JobManager, (req) => req.params.jobId),
  async (req: JobRequest, res: Response, next: NextFunction) => {
    try {
      const comms = await CommunicationManager.listForJob(req.params.jobId, {
        contractorId: req.query.contractorId as string,
        needsReview: req.query.needsReview === 'true' ? true : undefined,
        direction: req.query.direction as string,
      });
      res.json({ data: comms });
    } catch (err) { next(err); }
  },
);

// AI generations
jobRouter.post('/:jobId/ai-generations',
  permit(JobManager, (req) => req.params.jobId),
  validate(CreateAIGenerationSchema),
  async (req: JobRequest, res: Response, next: NextFunction) => {
    try {
      const gen = await aiService.generateImage({
        jobId: req.params.jobId,
        userId: req.user.userId,
        sourceImageId: req.body.sourceImageId,
        prompt: req.body.prompt,
        provider: req.body.provider || 'openai',
        metadata: req.body.metadata,
      });
      res.status(201).json({ data: gen });
    } catch (err) { next(err); }
  },
);

jobRouter.get('/:jobId/ai-generations',
  permit(JobManager, (req) => req.params.jobId),
  async (req: JobRequest, res: Response, next: NextFunction) => {
    try {
      const gens = await AIGenerationManager.listForJob(req.params.jobId);
      res.json({ data: gens });
    } catch (err) { next(err); }
  },
);

// AI diagnostic Q&A
jobRouter.post('/:jobId/diagnose/start',
  permit(JobManager, (req) => req.params.jobId),
  async (req: JobRequest, res: Response, next: NextFunction) => {
    try {
      const result = await aiService.startDiagnose(req.params.jobId);
      res.json({ data: result });
    } catch (err) { next(err); }
  },
);

jobRouter.post('/:jobId/diagnose',
  permit(JobManager, (req) => req.params.jobId),
  validate(DiagnoseSchema),
  async (req: JobRequest, res: Response, next: NextFunction) => {
    try {
      const result = await aiService.diagnoseJob(req.params.jobId, req.body.message);
      res.json({ data: result });
    } catch (err) { next(err); }
  },
);

// Email drafting + sending
jobRouter.post('/:jobId/email-drafts',
  permit(JobManager, (req) => req.params.jobId),
  validate(EmailDraftSchema),
  async (req: JobRequest, res: Response, next: NextFunction) => {
    try {
      const drafts = await aiService.draftEmail({ jobId: req.params.jobId, userId: req.user.userId, ...req.body });
      res.json({ data: drafts });
    } catch (err) { next(err); }
  },
);

jobRouter.post('/:jobId/send-email',
  permit(JobManager, (req) => req.params.jobId),
  async (req: JobRequest, res: Response, next: NextFunction) => {
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
