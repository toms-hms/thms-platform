import { prisma } from '../config/prisma';
import { NotFoundError } from '../utils/errors';

export async function listCommunications(
  jobId: string,
  userId: string,
  filters?: {
    contractorId?: string;
    needsReview?: boolean;
    direction?: string;
  }
) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { home: { include: { users: { where: { userId } } } } },
  });

  if (!job || job.home.users.length === 0) throw new NotFoundError('Job');

  return prisma.communication.findMany({
    where: {
      jobId,
      ...(filters?.contractorId && { contractorId: filters.contractorId }),
      ...(filters?.needsReview !== undefined && { needsReview: filters.needsReview }),
      ...(filters?.direction && { direction: filters.direction as any }),
    },
    include: { contractor: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getCommunication(communicationId: string) {
  const comm = await prisma.communication.findUnique({
    where: { id: communicationId },
    include: { contractor: true, job: true },
  });

  if (!comm) throw new NotFoundError('Communication');
  return comm;
}

export async function updateCommunication(
  communicationId: string,
  data: { needsReview?: boolean; parsedSummary?: string }
) {
  return prisma.communication.update({
    where: { id: communicationId },
    data,
  });
}

export async function createCommunication(data: {
  jobId?: string;
  contractorId?: string;
  direction: 'SENT' | 'RECEIVED';
  subject?: string;
  bodyText?: string;
  bodyHtml?: string;
  externalThreadId?: string;
  externalMessageId?: string;
  sentAt?: Date;
  receivedAt?: Date;
}) {
  return prisma.communication.create({
    data: {
      ...data,
      channel: 'EMAIL',
      needsReview: data.direction === 'RECEIVED',
    },
  });
}
