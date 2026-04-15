import { Router } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { CreateJobSchema, UpdateJobSchema, AssignContractorSchema, UpdateJobContractorSchema } from './schema';
import { CreateQuoteSchema } from '../quote/schema';
import { CreateAIGenerationSchema, EmailDraftSchema } from '../ai/schema';
import { JobManager } from './models/JobManager';
import { JobContractorManager } from './models/JobContractorManager';
import { permit } from '../permissions/permit';
import { PermissionService } from '../permissions/PermissionService';
import { HomeManager } from '../home/models/HomeManager';
import * as jobService from './service';
import * as uploadService from '../upload/service';
import * as quoteService from '../quote/service';
import * as communicationService from '../communication/service';
import * as aiService from '../ai/service';
import * as integrationService from '../integration/service';

function getUser(req: Parameters<typeof authenticateJWT>[0]) {
  return (req as unknown as AuthenticatedRequest).user;
}

// Mounted at /homes/:homeId/jobs
export const jobCollectionRouter = Router({ mergeParams: true });
jobCollectionRouter.use(authenticateJWT);

jobCollectionRouter.get('/',
  permit(HomeManager, (req) => (req.params as any).homeId),
  async (req, res, next) => {
    try {
      const { userId, role } = getUser(req);
      const jobs = await PermissionService.list(JobManager, userId, role,
        (req.params as any).homeId,
        { status: req.query.status as string, category: req.query.category as string }
      );
      res.json({ data: jobs });
    } catch (err) { next(err); }
  }
);

jobCollectionRouter.post('/', validate(CreateJobSchema), async (req, res, next) => {
  try {
    const { userId } = getUser(req);
    const job = await jobService.createJob((req.params as any).homeId, userId, req.body);
    res.status(201).json({ data: job });
  } catch (err) { next(err); }
});

// Mounted at /jobs
export const jobRouter = Router();
jobRouter.use(authenticateJWT);

jobRouter.get('/:jobId',
  permit(JobManager, (req) => req.params.jobId),
  async (req, res, next) => {
    try {
      const job = await jobService.getJob(req.params.jobId);
      res.json({ data: job });
    } catch (err) { next(err); }
  }
);

jobRouter.patch('/:jobId',
  permit(JobManager, (req) => req.params.jobId),
  validate(UpdateJobSchema),
  async (req, res, next) => {
    try {
      const job = await jobService.updateJob(req.params.jobId, req.body);
      res.json({ data: job });
    } catch (err) { next(err); }
  }
);

jobRouter.delete('/:jobId',
  permit(JobManager, (req) => req.params.jobId),
  async (req, res, next) => {
    try {
      await jobService.deleteJob(req.params.jobId);
      res.json({ data: { success: true } });
    } catch (err) { next(err); }
  }
);

// Contractors
jobRouter.get('/:jobId/contractors',
  permit(JobManager, (req) => req.params.jobId),
  async (req, res, next) => {
    try {
      const jcs = await jobService.listJobContractors(req.params.jobId);
      res.json({ data: jcs });
    } catch (err) { next(err); }
  }
);

jobRouter.post('/:jobId/contractors',
  permit(JobManager, (req) => req.params.jobId),
  validate(AssignContractorSchema),
  async (req, res, next) => {
    try {
      const jc = await jobService.assignContractor(req.params.jobId, req.body.contractorId, req.body.notes);
      res.status(201).json({ data: jc });
    } catch (err) { next(err); }
  }
);

jobRouter.patch('/:jobId/contractors/:jobContractorId',
  permit(JobContractorManager, (req) => req.params.jobContractorId),
  validate(UpdateJobContractorSchema),
  async (req, res, next) => {
    try {
      const jc = await jobService.updateJobContractorStatus(req.params.jobContractorId, req.body.status, req.body.notes);
      res.json({ data: jc });
    } catch (err) { next(err); }
  }
);

jobRouter.delete('/:jobId/contractors/:jobContractorId',
  permit(JobContractorManager, (req) => req.params.jobContractorId),
  async (req, res, next) => {
    try {
      await jobService.removeContractorFromJob(req.params.jobContractorId);
      res.json({ data: { success: true } });
    } catch (err) { next(err); }
  }
);

// Images
jobRouter.get('/:jobId/images',
  permit(JobManager, (req) => req.params.jobId),
  async (req, res, next) => {
    try {
      const images = await uploadService.listJobImages(req.params.jobId, getUser(req).userId);
      res.json({ data: images });
    } catch (err) { next(err); }
  }
);

jobRouter.post('/:jobId/images/upload-url',
  permit(JobManager, (req) => req.params.jobId),
  async (req, res, next) => {
    try {
      const { fileName, contentType, kind } = req.body;
      const result = await uploadService.getUploadUrl(req.params.jobId, getUser(req).userId, fileName, contentType, kind);
      res.json({ data: result });
    } catch (err) { next(err); }
  }
);

jobRouter.post('/:jobId/images/confirm',
  permit(JobManager, (req) => req.params.jobId),
  async (req, res, next) => {
    try {
      const image = await uploadService.confirmUpload({
        jobId: req.params.jobId,
        userId: getUser(req).userId,
        key: req.body.key,
        kind: req.body.kind || 'SOURCE',
        label: req.body.label,
      });
      res.status(201).json({ data: image });
    } catch (err) { next(err); }
  }
);

jobRouter.delete('/:jobId/images/:imageId',
  permit(JobManager, (req) => req.params.jobId),
  async (req, res, next) => {
    try {
      await uploadService.deleteJobImage(req.params.imageId, getUser(req).userId);
      res.json({ data: { success: true } });
    } catch (err) { next(err); }
  }
);

// Quotes
jobRouter.get('/:jobId/quotes',
  permit(JobManager, (req) => req.params.jobId),
  async (req, res, next) => {
    try {
      const quotes = await quoteService.listQuotes(req.params.jobId);
      res.json({ data: quotes });
    } catch (err) { next(err); }
  }
);

jobRouter.post('/:jobId/quotes',
  permit(JobManager, (req) => req.params.jobId),
  validate(CreateQuoteSchema),
  async (req, res, next) => {
    try {
      const quote = await quoteService.createQuote(req.params.jobId, req.body);
      res.status(201).json({ data: quote });
    } catch (err) { next(err); }
  }
);

// Communications
jobRouter.get('/:jobId/communications',
  permit(JobManager, (req) => req.params.jobId),
  async (req, res, next) => {
    try {
      const comms = await communicationService.listCommunications(req.params.jobId, {
        contractorId: req.query.contractorId as string,
        needsReview: req.query.needsReview === 'true' ? true : undefined,
        direction: req.query.direction as string,
      });
      res.json({ data: comms });
    } catch (err) { next(err); }
  }
);

// AI generations
jobRouter.post('/:jobId/ai-generations',
  permit(JobManager, (req) => req.params.jobId),
  validate(CreateAIGenerationSchema),
  async (req, res, next) => {
    try {
      const gen = await aiService.generateImage({
        jobId: req.params.jobId,
        userId: getUser(req).userId,
        sourceImageId: req.body.sourceImageId,
        prompt: req.body.prompt,
        provider: req.body.provider || 'openai',
        metadata: req.body.metadata,
      });
      res.status(201).json({ data: gen });
    } catch (err) { next(err); }
  }
);

jobRouter.get('/:jobId/ai-generations',
  permit(JobManager, (req) => req.params.jobId),
  async (req, res, next) => {
    try {
      const gens = await aiService.listAIGenerations(req.params.jobId);
      res.json({ data: gens });
    } catch (err) { next(err); }
  }
);

// Email drafting + sending
jobRouter.post('/:jobId/email-drafts',
  permit(JobManager, (req) => req.params.jobId),
  validate(EmailDraftSchema),
  async (req, res, next) => {
    try {
      const drafts = await aiService.draftEmail({ jobId: req.params.jobId, userId: getUser(req).userId, ...req.body });
      res.json({ data: drafts });
    } catch (err) { next(err); }
  }
);

jobRouter.post('/:jobId/send-email',
  permit(JobManager, (req) => req.params.jobId),
  async (req, res, next) => {
    try {
      const result = await integrationService.sendViaGmail({
        userId: getUser(req).userId,
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
  }
);
