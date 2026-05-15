import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { authenticateJWT } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validate.middleware';
import {
  ImageParamsSchema, ImagesQuerySchema,
  UploadUrlSchema, ConfirmUploadSchema,
  GetImagesRequest, GetUploadUrlRequest,
  ConfirmUploadRequest, DeleteImageRequest,
} from './schema';
import { JobImageManager } from '@/ai/models/JobImageManager';
import { JobManager } from '@/job/models/JobManager';
import { permit } from '@/permissions/permit';
import { PermissionService } from '@/permissions/PermissionService';
import { ForbiddenError } from '@/utils/errors';
import * as uploadService from '@/upload/service';

const imageRouter = Router();
imageRouter.use(authenticateJWT);

// GET /images?jobId=X — list images for a job
imageRouter.get('/',
  validate(ImagesQuerySchema, 'query'),
  async (req: GetImagesRequest, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.user;
      const { jobId } = req.query;
      if (!jobId) return res.json({ data: [] });
      const allowed = await PermissionService.check(JobManager, userId, jobId);
      if (!allowed) return next(new ForbiddenError());
      const images = await JobImageManager.listForJob(jobId);
      const withUrls = await Promise.all(
        images.map(async (img) => ({ ...img, url: await uploadService.getDownloadUrl(img.storageKey) }))
      );
      res.json({ data: withUrls });
    } catch (err) { next(err); }
  },
);

// POST /images/upload-url — get a presigned upload URL
imageRouter.post('/upload-url',
  validate(UploadUrlSchema),
  async (req: GetUploadUrlRequest, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.user;
      const allowed = await PermissionService.check(JobManager, userId, req.body.jobId);
      if (!allowed) return next(new ForbiddenError());
      const result = await uploadService.getUploadUrl(req.body.jobId, userId, req.body.fileName, req.body.contentType, req.body.kind);
      res.json({ data: result });
    } catch (err) { next(err); }
  },
);

// POST /images/confirm — confirm a completed upload
imageRouter.post('/confirm',
  validate(ConfirmUploadSchema),
  async (req: ConfirmUploadRequest, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.user;
      const allowed = await PermissionService.check(JobManager, userId, req.body.jobId);
      if (!allowed) return next(new ForbiddenError());
      const image = await uploadService.confirmUpload({
        jobId:  req.body.jobId,
        userId,
        key:    req.body.key,
        kind:   req.body.kind || 'SOURCE',
        label:  req.body.label,
      });
      res.status(201).json({ data: image });
    } catch (err) { next(err); }
  },
);

// DELETE /images/:imageId
imageRouter.delete('/:imageId',
  validate(ImageParamsSchema, 'params'),
  async (req: DeleteImageRequest, res: Response, next: NextFunction) => {
    try {
      await uploadService.deleteJobImage(req.params.imageId, req.user.userId);
      res.json({ data: { success: true } });
    } catch (err) { next(err); }
  },
);

export default imageRouter;
