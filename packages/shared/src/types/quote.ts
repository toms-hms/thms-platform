export enum QuoteStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
}

export interface QuoteDto {
  id: string;
  jobId: string;
  contractorId: string;
  amount: number;
  description?: string;
  status: QuoteStatus;
  sourceCommunicationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuoteInput {
  contractorId: string;
  amount: number;
  description?: string;
  status?: QuoteStatus;
  sourceCommunicationId?: string;
}

export interface UpdateQuoteInput {
  amount?: number;
  description?: string;
  status?: QuoteStatus;
}
