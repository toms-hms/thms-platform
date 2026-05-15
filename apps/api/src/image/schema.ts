import { z } from 'zod';
import type {
  TypedParamsRequest,
  TypedQueryRequest,
  TypedBodyRequest,
} from '@/middleware/auth.middleware';

// ─── Path param schemas ───────────────────────────────────────────────────────

export const ImageParamsSchema = z.object({ imageId: z.string().min(1) });

// ─── Query schemas (list filters) ─────────────────────────────────────────────

export const ImagesQuerySchema = z.object({ jobId: z.string().optional() });

// ─── Body schemas ─────────────────────────────────────────────────────────────

export const UploadUrlSchema = z.object({
  jobId:       z.string().min(1),
  fileName:    z.string().min(1),
  contentType: z.string().min(1),
  kind:        z.string().min(1),
});

export const ConfirmUploadSchema = z.object({
  jobId:  z.string().min(1),
  key:    z.string().min(1),
  kind:   z.string().optional(),
  label:  z.string().optional(),
});

// ─── Request types ────────────────────────────────────────────────────────────

// GET /images
export type GetImagesRequest     = TypedQueryRequest<typeof ImagesQuerySchema>;
// POST /images/upload-url
export type GetUploadUrlRequest  = TypedBodyRequest<typeof UploadUrlSchema>;
// POST /images/confirm
export type ConfirmUploadRequest = TypedBodyRequest<typeof ConfirmUploadSchema>;
// DELETE /images/:imageId
export type DeleteImageRequest   = TypedParamsRequest<typeof ImageParamsSchema>;
