export enum JobStatus {
  DRAFT = 'DRAFT',
  PLANNING = 'PLANNING',
  REACHING_OUT = 'REACHING_OUT',
  COMPARING_QUOTES = 'COMPARING_QUOTES',
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  AWAITING_PAYMENT = 'AWAITING_PAYMENT',
  COMPLETED = 'COMPLETED',
}

export interface JobDto {
  id: string;
  homeId: string;
  title: string;
  category: string;
  description?: string;
  notes?: string;
  status: JobStatus;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobInput {
  title: string;
  category: string;
  description?: string;
  notes?: string;
  status?: JobStatus;
}

export interface UpdateJobInput {
  title?: string;
  category?: string;
  description?: string;
  notes?: string;
  status?: JobStatus;
}
