import { createId } from '@paralleldrive/cuid2';
import { Factory } from 'fishery';
import { jobFactory } from '@/job/factories/Job.factory';
import { CommunicationManager } from '@/communication/models/CommunicationManager';
import { CommunicationChannel, CommunicationDirection } from '@/communication/models/Communication';
import type { Communication } from '@/communication/models/Communication';

export const communicationFactory = Factory.define<Communication>(({ onCreate, params }) => {
  onCreate(async (communication) => {
    const jobId = params.jobId ?? (await jobFactory.create()).id;

    return CommunicationManager.create({
      ...communication,
      jobId,
    });
  });

  return {
    id: createId(),
    jobId: params.jobId ?? createId(),
    contractorId: params.contractorId ?? null,
    channel: params.channel ?? CommunicationChannel.EMAIL,
    direction: params.direction ?? CommunicationDirection.SENT,
    subject: params.subject ?? 'Test Subject',
    bodyText: params.bodyText ?? 'Body',
    bodyHtml: params.bodyHtml ?? null,
    externalThreadId: params.externalThreadId ?? null,
    externalMessageId: params.externalMessageId ?? null,
    sentAt: params.sentAt ?? new Date(),
    receivedAt: params.receivedAt ?? null,
    parsedSummary: params.parsedSummary ?? null,
    needsReview: params.needsReview ?? false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
});
