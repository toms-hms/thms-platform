import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, BUCKET_NAME } from '../config/minio';
import { prisma } from '../config/prisma';
import { randomUUID } from 'crypto';

export async function getUploadUrl(
  jobId: string,
  userId: string,
  fileName: string,
  contentType: string,
  kind: string = 'SOURCE'
) {
  const ext = fileName.split('.').pop() || 'bin';
  const key = `jobs/${jobId}/${kind.toLowerCase()}/${randomUUID()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

  return { uploadUrl, key, kind };
}

export async function confirmUpload(data: {
  jobId: string;
  userId: string;
  key: string;
  kind: string;
  label?: string;
  aiGenerationId?: string;
}) {
  const image = await prisma.jobImage.create({
    data: {
      jobId: data.jobId,
      storageKey: data.key,
      kind: data.kind,
      label: data.label,
      aiGenerationId: data.aiGenerationId,
      uploadedById: data.userId,
    },
  });

  return image;
}

export async function getDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

export async function deleteObject(key: string) {
  const command = new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key });
  await s3Client.send(command);
}

export async function listJobImages(jobId: string, userId: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { home: { include: { users: { where: { userId } } } } },
  });

  if (!job || job.home.users.length === 0) {
    return [];
  }

  const images = await prisma.jobImage.findMany({
    where: { jobId },
    orderBy: { createdAt: 'desc' },
  });

  return Promise.all(
    images.map(async (img) => ({
      ...img,
      url: await getDownloadUrl(img.storageKey),
    }))
  );
}

export async function deleteJobImage(imageId: string, userId: string) {
  const image = await prisma.jobImage.findUnique({
    where: { id: imageId },
    include: { job: { include: { home: { include: { users: { where: { userId } } } } } } },
  });

  if (!image || image.job.home.users.length === 0) {
    throw new Error('Image not found');
  }

  await deleteObject(image.storageKey);
  await prisma.jobImage.delete({ where: { id: imageId } });
}
