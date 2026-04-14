import { Router } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { CreateJobSchema, UpdateJobSchema, AssignContractorSchema, UpdateJobContractorSchema } from './schema';
import { CreateQuoteSchema } from '../quote/schema';
import { CreateAIGenerationSchema, EmailDraftSchema } from '../ai/schema';
import * as jobService from './service';
import * as uploadService from '../upload/service';
import * as quoteService from '../quote/service';
import * as communicationService from '../communication/service';
import * as aiService from '../ai/service';
import * as integrationService from '../integration/service';
import { prisma } from '../config/prisma';

// Mounted at /homes/:homeId/jobs — handles collection endpoints
export const jobCollectionRouter = Router({ mergeParams: true });
jobCollectionRouter.use(authenticateJWT);

jobCollectionRouter.get('/', async (req, res, next) => {
  try {
    const jobs = await jobService.listJobs(
      (req.params as any).homeId,
      (req as unknown as AuthenticatedRequest).user.userId,
      { status: req.query.status as string, category: req.query.category as string }
    );
    res.json({ data: jobs });
  } catch (err) { next(err); }
});

jobCollectionRouter.post('/', validate(CreateJobSchema), async (req, res, next) => {
  try {
    const job = await jobService.createJob(
      (req.params as any).homeId,
      (req as unknown as AuthenticatedRequest).user.userId,
      req.body
    );
    res.status(201).json({ data: job });
  } catch (err) { next(err); }
});

// Mounted at /jobs — handles item + nested endpoints
export const jobRouter = Router();
jobRouter.use(authenticateJWT);

jobRouter.get('/:jobId', async (req, res, next) => {
  try {
    const job = await jobService.getJob(req.params.jobId, (req as unknown as AuthenticatedRequest).user.userId);
    res.json({ data: job });
  } catch (err) { next(err); }
});

jobRouter.patch('/:jobId', validate(UpdateJobSchema), async (req, res, next) => {
  try {
    const job = await jobService.updateJob(req.params.jobId, (req as unknown as AuthenticatedRequest).user.userId, req.body);
    res.json({ data: job });
  } catch (err) { next(err); }
});

jobRouter.delete('/:jobId', async (req, res, next) => {
  try {
    await jobService.deleteJob(req.params.jobId, (req as unknown as AuthenticatedRequest).user.userId);
    res.json({ data: { success: true } });
  } catch (err) { next(err); }
});

// Contractors
jobRouter.get('/:jobId/contractors', async (req, res, next) => {
  try {
    const jcs = await prisma.jobContractor.findMany({
      where: { jobId: req.params.jobId },
      include: { contractor: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ data: jcs });
  } catch (err) { next(err); }
});

jobRouter.post('/:jobId/contractors', validate(AssignContractorSchema), async (req, res, next) => {
  try {
    const jc = await jobService.assignContractor(
      req.params.jobId, (req as unknown as AuthenticatedRequest).user.userId,
      req.body.contractorId, req.body.notes
    );
    res.status(201).json({ data: jc });
  } catch (err) { next(err); }
});

jobRouter.patch('/:jobId/contractors/:jobContractorId', validate(UpdateJobContractorSchema), async (req, res, next) => {
  try {
    const jc = await jobService.updateJobContractorStatus(
      req.params.jobContractorId, (req as unknown as AuthenticatedRequest).user.userId,
      req.body.status, req.body.notes
    );
    res.json({ data: jc });
  } catch (err) { next(err); }
});

jobRouter.delete('/:jobId/contractors/:jobContractorId', async (req, res, next) => {
  try {
    await jobService.removeContractorFromJob(req.params.jobContractorId, (req as unknown as AuthenticatedRequest).user.userId);
    res.json({ data: { success: true } });
  } catch (err) { next(err); }
});

// Images
jobRouter.get('/:jobId/images', async (req, res, next) => {
  try {
    const images = await uploadService.listJobImages(req.params.jobId, (req as unknown as AuthenticatedRequest).user.userId);
    res.json({ data: images });
  } catch (err) { next(err); }
});

jobRouter.post('/:jobId/images/upload-url', async (req, res, next) => {
  try {
    const { fileName, contentType, kind } = req.body;
    const result = await uploadService.getUploadUrl(
      req.params.jobId, (req as unknown as AuthenticatedRequest).user.userId,
      fileName, contentType, kind
    );
    res.json({ data: result });
  } catch (err) { next(err); }
});

jobRouter.post('/:jobId/images/confirm', async (req, res, next) => {
  try {
    const image = await uploadService.confirmUpload({
      jobId: req.params.jobId,
      userId: (req as unknown as AuthenticatedRequest).user.userId,
      key: req.body.key,
      kind: req.body.kind || 'SOURCE',
      label: req.body.label,
    });
    res.status(201).json({ data: image });
  } catch (err) { next(err); }
});

jobRouter.delete('/:jobId/images/:imageId', async (req, res, next) => {
  try {
    await uploadService.deleteJobImage(req.params.imageId, (req as unknown as AuthenticatedRequest).user.userId);
    res.json({ data: { success: true } });
  } catch (err) { next(err); }
});

// Quotes
jobRouter.get('/:jobId/quotes', async (req, res, next) => {
  try {
    const quotes = await quoteService.listQuotes(req.params.jobId, (req as unknown as AuthenticatedRequest).user.userId);
    res.json({ data: quotes });
  } catch (err) { next(err); }
});

jobRouter.post('/:jobId/quotes', validate(CreateQuoteSchema), async (req, res, next) => {
  try {
    const quote = await quoteService.createQuote(req.params.jobId, (req as unknown as AuthenticatedRequest).user.userId, req.body);
    res.status(201).json({ data: quote });
  } catch (err) { next(err); }
});

// Communications
jobRouter.get('/:jobId/communications', async (req, res, next) => {
  try {
    const comms = await communicationService.listCommunications(
      req.params.jobId, (req as unknown as AuthenticatedRequest).user.userId,
      {
        contractorId: req.query.contractorId as string,
        needsReview: req.query.needsReview === 'true' ? true : undefined,
        direction: req.query.direction as string,
      }
    );
    res.json({ data: comms });
  } catch (err) { next(err); }
});

// AI generations
jobRouter.post('/:jobId/ai-generations', validate(CreateAIGenerationSchema), async (req, res, next) => {
  try {
    const gen = await aiService.generateImage({
      jobId: req.params.jobId,
      userId: (req as unknown as AuthenticatedRequest).user.userId,
      sourceImageId: req.body.sourceImageId,
      prompt: req.body.prompt,
      provider: req.body.provider || 'openai',
      metadata: req.body.metadata,
    });
    res.status(201).json({ data: gen });
  } catch (err) { next(err); }
});

jobRouter.get('/:jobId/ai-generations', async (req, res, next) => {
  try {
    const gens = await aiService.listAIGenerations(req.params.jobId);
    res.json({ data: gens });
  } catch (err) { next(err); }
});

// Email drafting + sending
jobRouter.post('/:jobId/email-drafts', validate(EmailDraftSchema), async (req, res, next) => {
  try {
    const drafts = await aiService.draftEmail({
      jobId: req.params.jobId,
      userId: (req as unknown as AuthenticatedRequest).user.userId,
      ...req.body,
    });
    res.json({ data: drafts });
  } catch (err) { next(err); }
});

jobRouter.post('/:jobId/send-email', async (req, res, next) => {
  try {
    const result = await integrationService.sendViaGmail({
      userId: (req as unknown as AuthenticatedRequest).user.userId,
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
});
