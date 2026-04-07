export enum CommunicationChannel {
  EMAIL = 'EMAIL',
}

export enum CommunicationDirection {
  SENT = 'SENT',
  RECEIVED = 'RECEIVED',
}

export interface CommunicationDto {
  id: string;
  jobId?: string;
  contractorId?: string;
  channel: CommunicationChannel;
  direction: CommunicationDirection;
  subject?: string;
  bodyText?: string;
  bodyHtml?: string;
  externalThreadId?: string;
  externalMessageId?: string;
  sentAt?: string;
  receivedAt?: string;
  parsedSummary?: string;
  needsReview: boolean;
  createdAt: string;
}
