export interface AIGenerationDto {
  id: string;
  jobId: string;
  originalImageUrl?: string;
  prompt: string;
  generatedImageUrl?: string;
  provider: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
}

export interface CreateAIGenerationInput {
  sourceImageId: string;
  provider: string;
  prompt: string;
  metadata?: Record<string, unknown>;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface IssueSummary {
  intent: 'ISSUE';
  rootCause: string;
  severity: string;
  scope: string;
  priceRange: [number, number];
  constraints: string[];
}

export interface ImprovementSummary {
  intent: 'IMPROVEMENT';
  scope: string;
  priceRange: [number, number];
  constraints: string[];
}

export interface RecurringSummary {
  intent: 'RECURRING_WORK';
  frequency: string;
  scope: string;
  priceRange: [number, number];
}

export type AiSessionSummary = IssueSummary | ImprovementSummary | RecurringSummary;

export interface AiSession {
  messages: ChatMessage[];
  summary: AiSessionSummary | null;
}
