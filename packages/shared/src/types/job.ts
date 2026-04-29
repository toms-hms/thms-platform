import { TradeCategory } from './trade-category';
import { JobIntent } from './job-intent';
import type { AiSession } from './ai';

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
  intent: JobIntent;
  category: TradeCategory;
  description?: string;
  notes?: string;
  status: JobStatus;
  aiSession?: AiSession | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobInput {
  title: string;
  intent: JobIntent;
  category: TradeCategory;
  description?: string;
  notes?: string;
  status?: JobStatus;
}

export interface UpdateJobInput {
  title?: string;
  category?: TradeCategory;
  description?: string;
  notes?: string;
  status?: JobStatus;
  aiSession?: AiSession | null;
}
