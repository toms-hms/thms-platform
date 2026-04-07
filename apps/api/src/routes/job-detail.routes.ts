import { Router } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
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
import * as integrationsService from '../services/integrations.service';
import { z } from 'zod';

const router = Router();

router.use(authenticateJWT);

router.get('/:jobId', async (req, res, next) => {
  try {
    const job = await jobsService.getJob(
      req.params.jobId,
      (req as unknown as AuthenticatedRequest).user.userId
    );
    res.json({ data: job });
  } catch (err) {
    next(err);
  }
});

router.patch('/:jobId', validate(UpdateJobSchema), async (req, res, next) => {
  try {
    const job = await jobsService.updateJob(
      req.params.jobId,
      (req as unknown as AuthenticatedRequest).user.userId,
      req.body
    );
    res.json({ data: job });
  } catch (err) {
    next(err);
  }
});

router.delete('/:jobId', async (req, res, next) => {
  try {
    await jobsService.deleteJob(
      req.params.jobId,
      (req as unknown as AuthenticatedRequest).user.userId
    );
    res.json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
});

// Job Contractors
router.get('/:jobId/contractors', async (req, res, next) => {
  try {
    const { prisma } = await import('../config/prisma');
    const jcs = await prisma.jobContractor.findMany({
      where: { jobId: req.params.jobId },
      include: { contractor: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ data: jcs });
  } catch (err) {
    next(err);
  }
});

router.post('/:jobId/contractors', validate(AssignContractorSchema), async (req, res, next) => {
  try {
    const jc = await jobsService.assignContractor(
      req.params.jobId,
      (req as unknown as AuthenticatedRequest).user.userId,
      req.body.contractorId,
      req.body.notes
    );
    res.status(201).json({ data: jc });
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/:jobId/contractors/:jobContractorId',
  validate(UpdateJobContractorSchema),
  async (req, res, next) => {
    try {
      const jc = await jobsService.updateJobContractorStatus(
        req.params.jobContractorId,
        (req as unknown as AuthenticatedRequest).user.userId,
        req.body.status,
        req.body.notes
      );
      res.json({ data: jc });
    } catch (err) {
      next(err);
    }
  }
);

router.delete('/:jobId/contractors/:jobContractorId', async (req, res, next) => {
  try {
    await jobsService.removeContractorFromJob(
      req.params.jobContractorId,
      (req as unknown as AuthenticatedRequest).user.userId
    );
    res.json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
});

// Job Images
router.get('/:jobId/images', async (req, res, next) => {
  try {
    const images = await uploadService.listJobImages(
      req.params.jobId,
      (req as unknown as AuthenticatedRequest).user.userId
    );
    res.json({ data: images });
  } catch (err) {
    next(err);
  }
});

router.post('/:jobId/images/upload-url', async (req, res, next) => {
  try {
    const { fileName, contentType, kind } = req.body;
    const result = await uploadService.getUploadUrl(
      req.params.jobId,
      (req as unknown as AuthenticatedRequest).user.userId,
      fileName,
      contentType,
      kind
    );
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/:jobId/images/confirm', async (req, res, next) => {
  try {
    const image = await uploadService.confirmUpload({
      jobId: req.params.jobId,
      userId: (req as unknown as AuthenticatedRequest).user.userId,
      key: req.body.key,
      kind: req.body.kind || 'SOURCE',
      label: req.body.label,
    });
    res.status(201).json({ data: image });
  } catch (err) {
    next(err);
  }
});

router.delete('/:jobId/images/:imageId', async (req, res, next) => {
  try {
    await uploadService.deleteJobImage(
      req.params.imageId,
      (req as unknown as AuthenticatedRequest).user.userId
    );
    res.json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
});

// Job Quotes
router.get('/:jobId/quotes', async (req, res, next) => {
  try {
    const quotes = await quotesService.listQuotes(
      req.params.jobId,
      (req as unknown as AuthenticatedRequest).user.userId
    );
    res.json({ data: quotes });
  } catch (err) {
    next(err);
  }
});

router.post('/:jobId/quotes', validate(CreateQuoteSchema), async (req, res, next) => {
  try {
    const quote = await quotesService.createQuote(
      req.params.jobId,
      (req as unknown as AuthenticatedRequest).user.userId,
      req.body
    );
    res.status(201).json({ data: quote });
  } catch (err) {
    next(err);
  }
});

// Job Communications
router.get('/:jobId/communications', async (req, res, next) => {
  try {
    const comms = await communicationsService.listCommunications(
      req.params.jobId,
      (req as unknown as AuthenticatedRequest).user.userId,
      {
        contractorId: req.query.contractorId as string,
        needsReview: req.query.needsReview === 'true' ? true : undefined,
        direction: req.query.direction as string,
      }
    );
    res.json({ data: comms });
  } catch (err) {
    next(err);
  }
});

// AI Generations
router.post('/:jobId/ai-generations', validate(CreateAIGenerationSchema), async (req, res, next) => {
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
  } catch (err) {
    next(err);
  }
});

router.get('/:jobId/ai-generations', async (req, res, next) => {
  try {
    const gens = await aiService.listAIGenerations(req.params.jobId);
    res.json({ data: gens });
  } catch (err) {
    next(err);
  }
});

// Email drafting
router.post('/:jobId/email-drafts', validate(EmailDraftSchema), async (req, res, next) => {
  try {
    const drafts = await aiService.draftEmail({
      jobId: req.params.jobId,
      userId: (req as unknown as AuthenticatedRequest).user.userId,
      ...req.body,
    });
    res.json({ data: drafts });
  } catch (err) {
    next(err);
  }
});

// Send email
router.post('/:jobId/send-email', async (req, res, next) => {
  try {
    const result = await integrationsService.sendViaGmail({
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
  } catch (err) {
    next(err);
  }
});

export default router;
