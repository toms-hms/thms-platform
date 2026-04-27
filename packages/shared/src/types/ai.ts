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
