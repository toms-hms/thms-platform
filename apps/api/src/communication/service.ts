import { createId } from '@paralleldrive/cuid2';
import { NotFoundError } from '../utils/errors';
import { CommunicationManager } from './models/CommunicationManager';

export async function listCommunications(
  jobId: string,
  filters?: { contractorId?: string; needsReview?: boolean; direction?: string }
) {
  return CommunicationManager.listForJob(jobId, filters);
}

export async function getCommunication(communicationId: string) {
  const comm = await CommunicationManager.findById(communicationId);
  if (!comm) throw new NotFoundError('Communication');
  return comm;
}

export async function updateCommunication(communicationId: string, data: { needsReview?: boolean; parsedSummary?: string }) {
  return CommunicationManager.update(communicationId, data);
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
  return CommunicationManager.create({
    id: createId(),
    ...data,
    jobId: data.jobId ?? null,
    contractorId: data.contractorId ?? null,
    subject: data.subject ?? null,
    bodyText: data.bodyText ?? null,
    bodyHtml: data.bodyHtml ?? null,
    externalThreadId: data.externalThreadId ?? null,
    externalMessageId: data.externalMessageId ?? null,
    sentAt: data.sentAt ?? null,
    receivedAt: data.receivedAt ?? null,
    parsedSummary: null,
    needsReview: data.direction === 'RECEIVED',
    updatedAt: new Date(),
  });
}
