export enum IntegrationType {
  EMAIL = 'EMAIL',
  AI = 'AI',
}

export enum IntegrationProvider {
  GOOGLE = 'GOOGLE',
  MICROSOFT = 'MICROSOFT',
  OPENAI = 'OPENAI',
}

export interface IntegrationDto {
  id: string;
  userId: string;
  type: IntegrationType;
  provider: IntegrationProvider;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  email?: string;
  createdAt: string;
  updatedAt: string;
}
