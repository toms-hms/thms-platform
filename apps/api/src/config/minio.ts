import { S3Client } from '@aws-sdk/client-s3';
import { env } from './env';

const protocol = env.MINIO_USE_SSL ? 'https' : 'http';

export const s3Client = new S3Client({
  endpoint: `${protocol}://${env.MINIO_ENDPOINT}:${env.MINIO_PORT}`,
  region: 'us-east-1',
  credentials: {
    accessKeyId: env.MINIO_ACCESS_KEY,
    secretAccessKey: env.MINIO_SECRET_KEY,
  },
  forcePathStyle: true,
});

export const BUCKET_NAME = env.MINIO_BUCKET;
