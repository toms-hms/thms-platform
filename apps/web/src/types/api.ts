/**
 * Types for the GraphQL API.
 *
 * The web app deploys separately from the API, so it cannot import runtime code
 * across the app boundary (see `.ai/rules/core.md`). This file mirrors the
 * server's schema — `apps/api/config/schema.py` and the app `schema.py` files —
 * and is the only place the web app describes the API's shapes.
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum TradeCategory {
  PLUMBING = 'PLUMBING',
  ELECTRICAL = 'ELECTRICAL',
  HVAC = 'HVAC',
  ROOFING = 'ROOFING',
  PAINTING = 'PAINTING',
  LANDSCAPING = 'LANDSCAPING',
  GENERAL_CONTRACTING = 'GENERAL_CONTRACTING',
  CARPENTRY = 'CARPENTRY',
  FLOORING = 'FLOORING',
  PEST_CONTROL = 'PEST_CONTROL',
  DOORS_AND_WINDOWS = 'DOORS_AND_WINDOWS',
  POOL_AND_SPA = 'POOL_AND_SPA',
}

export enum JobIntent {
  ISSUE = 'ISSUE',
  IMPROVEMENT = 'IMPROVEMENT',
  RECURRING_WORK = 'RECURRING_WORK',
}

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

export enum QuoteStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
}

export enum CommunicationChannel {
  EMAIL = 'EMAIL',
}

export enum CommunicationDirection {
  SENT = 'SENT',
  RECEIVED = 'RECEIVED',
}

export enum HomeRole {
  OWNER = 'OWNER',
  MEMBER = 'MEMBER',
}

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum IntegrationType {
  EMAIL = 'EMAIL',
  AI = 'AI',
}

export enum IntegrationProvider {
  GOOGLE = 'GOOGLE',
  MICROSOFT = 'MICROSOFT',
  OPENAI = 'OPENAI',
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ─── Homes ────────────────────────────────────────────────────────────────────

export interface HomeDto {
  id: string;
  name: string;
  address1: string;
  address2?: string | null;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  notes?: string | null;
  fullAddress: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHomeInput {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
  notes?: string;
}

export interface UpdateHomeInput {
  name?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
}

export interface HomeMemberDto {
  user: UserDto;
  role: HomeRole;
  createdAt: string;
}

// ─── Contractors ──────────────────────────────────────────────────────────────

export interface ContractorDto {
  id: string;
  name: string;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  categories: TradeCategory[];
  zipCodes: string[];
  notes?: string | null;
  isGlobal: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContractorInput {
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  categories: TradeCategory[];
  zipCodes?: string[];
  notes?: string;
}

export interface UpdateContractorInput {
  name?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  categories?: TradeCategory[];
  zipCodes?: string[];
  notes?: string;
}

export interface ContractorJobHistoryDto {
  jobId: string;
  jobTitle: string;
  jobStatus: JobStatus;
  homeId: string;
  homeName: string;
  contractorStatus: JobContractorStatus;
}

export interface UserContractorDto {
  id: string;
  note?: string | null;
  contractor: ContractorDto;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserContractorInput {
  contractorId?: string;
  note?: string;
  // Used when creating a private contractor on the fly.
  name?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  categories?: TradeCategory[];
  zipCodes?: string[];
  notes?: string;
}

// ─── AI session ───────────────────────────────────────────────────────────────

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
  constraints?: string[];
}

export type AiSessionSummary = IssueSummary | ImprovementSummary | RecurringSummary;

export interface CategorySuggestion {
  category: TradeCategory;
  reason: string;
}

export interface AiSession {
  messages: ChatMessage[];
  summary: AiSessionSummary | null;
  categorySuggestions?: CategorySuggestion[];
  confirmedCategories?: TradeCategory[];
}

export interface DiagnoseResult {
  question: string | null;
  options: string[];
  summary: AiSessionSummary | null;
  suggestedCategories: CategorySuggestion[] | null;
  messages: ChatMessage[];
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export interface JobDto {
  id: string;
  homeId: string;
  createdByUserId: string;
  title: string;
  intent: JobIntent;
  category: TradeCategory;
  description?: string | null;
  notes?: string | null;
  status: JobStatus;
  aiSession?: AiSession | null;
  home?: { id: string; name: string };
  createdBy?: { id: string };
  createdAt: string;
  updatedAt: string;
  // Present only on the single-job query, which loads the job's relations.
  contractors?: JobContractorDto[];
  quotes?: QuoteDto[];
  communications?: CommunicationDto[];
  aiGenerations?: AIGenerationDto[];
  images?: JobImageDto[];
}

export interface CreateJobInput {
  title: string;
  intent?: JobIntent;
  category: TradeCategory;
  categories?: TradeCategory[];
  description?: string;
  notes?: string;
  status?: JobStatus;
  aiSession?: AiSession | null;
}

export interface UpdateJobInput {
  title?: string;
  intent?: JobIntent;
  category?: TradeCategory;
  categories?: TradeCategory[];
  description?: string;
  notes?: string;
  status?: JobStatus;
  aiSession?: AiSession | null;
}

export interface JobContractorDto {
  id: string;
  jobId: string;
  contractorId: string;
  contractor: ContractorDto;
  status: JobContractorStatus;
  lastContactedAt?: string | null;
  lastResponseAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Quotes ───────────────────────────────────────────────────────────────────

export interface QuoteDto {
  id: string;
  jobId: string;
  contractorId: string;
  sourceCommunicationId?: string | null;
  contractor: ContractorDto;
  amount: number;
  description?: string | null;
  status: QuoteStatus;
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

// ─── Communications ───────────────────────────────────────────────────────────

export interface CommunicationDto {
  id: string;
  jobId?: string | null;
  contractorId?: string | null;
  contractor?: ContractorDto | null;
  channel: CommunicationChannel;
  direction: CommunicationDirection;
  subject?: string | null;
  bodyText?: string | null;
  bodyHtml?: string | null;
  externalThreadId?: string | null;
  externalMessageId?: string | null;
  sentAt?: string | null;
  receivedAt?: string | null;
  parsedSummary?: string | null;
  needsReview: boolean;
  createdAt: string;
}

export interface UpdateCommunicationInput {
  needsReview?: boolean;
  parsedSummary?: string;
}

// ─── Images and AI generations ────────────────────────────────────────────────

export interface JobImageDto {
  id: string;
  jobId: string;
  aiGenerationId?: string | null;
  storageKey: string;
  kind: string;
  label?: string | null;
  url: string;
  createdAt: string;
}

export interface AIGenerationDto {
  id: string;
  jobId: string;
  originalImageUrl?: string | null;
  prompt: string;
  generatedImageUrl?: string | null;
  provider: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
}

export interface UploadUrlDto {
  uploadUrl: string;
  key: string;
  kind: string;
}

export interface EmailDraftDto {
  contractorId: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
}

export interface EmailDraftInput {
  contractorIds: string[];
  tone?: string;
  includeImages?: boolean;
  customInstructions?: string;
}

export interface SendEmailInput {
  integrationId: string;
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  contractorId?: string;
}

// ─── Integrations ─────────────────────────────────────────────────────────────

export interface IntegrationDto {
  id: string;
  type: IntegrationType;
  provider: IntegrationProvider;
  status: 'CONNECTED';
  email?: string | null;
  scopes: string[];
  createdAt: string;
  updatedAt: string;
}
