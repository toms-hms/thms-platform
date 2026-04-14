import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, BUCKET_NAME } from '../config/minio';
import { randomUUID } from 'crypto';
import { createId } from '@paralleldrive/cuid2';
import { JobImageManager } from '../ai/models/JobImageManager';
import { JobManager } from '../job/models/JobManager';

export async function getUploadUrl(jobId: string, userId: string, fileName: string, contentType: string, kind = 'SOURCE') {
  const ext = fileName.split('.').pop() || 'bin';
  const key = `jobs/${jobId}/${kind.toLowerCase()}/${randomUUID()}.${ext}`;
  const command = new PutObjectCommand({ Bucket: BUCKET_NAME, Key: key, ContentType: contentType });
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
  return { uploadUrl, key, kind };
}

export async function confirmUpload(data: { jobId: string; userId: string; key: string; kind: string; label?: string; aiGenerationId?: string }) {
  return JobImageManager.create({
    id: createId(),
    jobId: data.jobId,
    storageKey: data.key,
    kind: data.kind,
    label: data.label ?? null,
    aiGenerationId: data.aiGenerationId ?? null,
    uploadedById: data.userId,
  });
}

export async function getDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

export async function deleteObject(key: string) {
  await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
}

export async function listJobImages(jobId: string, userId: string) {
  const job = await JobManager.findByIdForUser(jobId, userId);
  const images = await JobImageManager.listForJob(jobId);
  return Promise.all(images.map(async (img) => ({ ...img, url: await getDownloadUrl(img.storageKey) })));
}

export async function deleteJobImage(imageId: string, userId: string) {
  const image = await JobImageManager.findById(imageId);
  if (!image) throw new Error('Image not found');
  await JobManager.findByIdForUser(image.jobId, userId);
  await deleteObject(image.storageKey);
  await JobImageManager.delete(imageId);
}
