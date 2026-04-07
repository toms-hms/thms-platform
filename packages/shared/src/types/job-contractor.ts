export enum JobContractorStatus {
  NOT_CONTACTED = 'NOT_CONTACTED',
  CONTACTED = 'CONTACTED',
  RESPONDED = 'RESPONDED',
  VISIT_REQUESTED = 'VISIT_REQUESTED',
  VISIT_SCHEDULED = 'VISIT_SCHEDULED',
  VISIT_COMPLETED = 'VISIT_COMPLETED',
  QUOTE_RECEIVED = 'QUOTE_RECEIVED',
  DECLINED = 'DECLINED',
  ACCEPTED = 'ACCEPTED',
  WORK_IN_PROGRESS = 'WORK_IN_PROGRESS',
  WORK_COMPLETED = 'WORK_COMPLETED',
  PAID = 'PAID',
}

export interface JobContractorDto {
  id: string;
  jobId: string;
  contractorId: string;
  status: JobContractorStatus;
  lastContactedAt?: string;
  lastResponseAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
