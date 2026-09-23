import { gqlRequest } from '@/lib/graphql';
import type {
  AIGenerationDto,
  CommunicationDto,
  CreateQuoteInput,
  EmailDraftDto,
  EmailDraftInput,
  JobContractorDto,
  JobContractorStatus,
  JobDto,
  JobImageDto,
  QuoteDto,
  SendEmailInput,
  UpdateJobInput,
  UpdateQuoteInput,
  UploadUrlDto,
} from '@/types/api';
import {
  AI_GENERATION_FIELDS,
  JOB_CONTRACTOR_FIELDS,
  JOB_IMAGE_FIELDS,
  QUOTE_FIELDS,
} from './queries';

const JOB_FIELDS = `id homeId createdByUserId title intent category description notes status aiSession createdAt updatedAt`;
const COMMUNICATION_FIELDS = `
  id jobId contractorId channel direction subject bodyText bodyHtml sentAt receivedAt parsedSummary needsReview createdAt
`;

/** Updates fields on an existing job. */
export async function updateJob(jobId: string, input: UpdateJobInput): Promise<{ data: JobDto }> {
  const data = await gqlRequest<{ updateJob: { job: JobDto } }>(
    `mutation UpdateJob(
       $jobId: ID!, $title: String, $category: TradeCategory, $intent: JobIntent,
       $categories: [TradeCategory!], $description: String, $notes: String,
       $status: JobStatus, $aiSession: JSONString
     ) {
       updateJob(
         jobId: $jobId, title: $title, category: $category, intent: $intent,
         categories: $categories, description: $description, notes: $notes,
         status: $status, aiSession: $aiSession
       ) { job { ${JOB_FIELDS} } }
     }`,
    { jobId, ...input, aiSession: input.aiSession ? JSON.stringify(input.aiSession) : undefined }
  );
  return { data: data.updateJob.job };
}

/** Assigns a contractor to a job. */
export async function assignContractor(input: {
  jobId: string;
  contractorId: string;
  notes?: string;
}): Promise<{ data: JobContractorDto }> {
  const data = await gqlRequest<{ assignContractor: { jobContractor: JobContractorDto } }>(
    `mutation AssignContractor($jobId: ID!, $contractorId: ID!, $notes: String) {
       assignContractor(jobId: $jobId, contractorId: $contractorId, notes: $notes) {
         jobContractor { ${JOB_CONTRACTOR_FIELDS} }
       }
     }`,
    input
  );
  return { data: data.assignContractor.jobContractor };
}

/** Updates the status of a job-contractor assignment. */
export async function updateJobContractorStatus(
  jobContractorId: string,
  input: { status: JobContractorStatus; notes?: string }
): Promise<{ data: JobContractorDto }> {
  const data = await gqlRequest<{ updateJobContractor: { jobContractor: JobContractorDto } }>(
    `mutation UpdateJobContractor($jobContractorId: ID!, $status: JobContractorStatus!, $notes: String) {
       updateJobContractor(jobContractorId: $jobContractorId, status: $status, notes: $notes) {
         jobContractor { ${JOB_CONTRACTOR_FIELDS} }
       }
     }`,
    { jobContractorId, ...input }
  );
  return { data: data.updateJobContractor.jobContractor };
}

/** Removes a contractor from a job. */
export async function removeJobContractor(jobContractorId: string): Promise<{ data: { success: boolean } }> {
  const data = await gqlRequest<{ removeJobContractor: { success: boolean } }>(
    `mutation RemoveJobContractor($jobContractorId: ID!) {
       removeJobContractor(jobContractorId: $jobContractorId) { success }
     }`,
    { jobContractorId }
  );
  return { data: data.removeJobContractor };
}

/** Creates a quote for a job. */
export async function createQuote(input: CreateQuoteInput & { jobId: string }): Promise<{ data: QuoteDto }> {
  const data = await gqlRequest<{ createQuote: { quote: QuoteDto } }>(
    `mutation CreateQuote(
       $jobId: ID!, $contractorId: ID!, $amount: Float!, $description: String,
       $status: QuoteStatus, $sourceCommunicationId: ID
     ) {
       createQuote(
         jobId: $jobId, contractorId: $contractorId, amount: $amount, description: $description,
         status: $status, sourceCommunicationId: $sourceCommunicationId
       ) { quote { ${QUOTE_FIELDS} } }
     }`,
    input as unknown as Record<string, unknown>
  );
  return { data: data.createQuote.quote };
}

/** Updates an existing quote. */
export async function updateQuote(quoteId: string, input: UpdateQuoteInput): Promise<{ data: QuoteDto }> {
  const data = await gqlRequest<{ updateQuote: { quote: QuoteDto } }>(
    `mutation UpdateQuote($quoteId: ID!, $amount: Float, $description: String, $status: QuoteStatus) {
       updateQuote(quoteId: $quoteId, amount: $amount, description: $description, status: $status) {
         quote { ${QUOTE_FIELDS} }
       }
     }`,
    { quoteId, ...input }
  );
  return { data: data.updateQuote.quote };
}

/** Deletes a quote by ID. */
export async function deleteQuote(quoteId: string): Promise<{ data: { success: boolean } }> {
  const data = await gqlRequest<{ deleteQuote: { success: boolean } }>(
    `mutation DeleteQuote($quoteId: ID!) { deleteQuote(quoteId: $quoteId) { success } }`,
    { quoteId }
  );
  return { data: data.deleteQuote };
}

/** Requests a presigned URL for uploading a job image to object storage. */
export async function getUploadUrl(input: {
  jobId: string;
  fileName: string;
  contentType: string;
  kind: string;
}): Promise<{ data: UploadUrlDto }> {
  const data = await gqlRequest<{ requestUploadUrl: { upload: UploadUrlDto } }>(
    `mutation RequestUploadUrl($jobId: ID!, $fileName: String!, $contentType: String!, $kind: String!) {
       requestUploadUrl(jobId: $jobId, fileName: $fileName, contentType: $contentType, kind: $kind) {
         upload { uploadUrl key kind }
       }
     }`,
    input
  );
  return { data: data.requestUploadUrl.upload };
}

/** Confirms a completed image upload and persists the image record. */
export async function confirmUpload(input: {
  jobId: string;
  key: string;
  kind?: string;
  label?: string;
}): Promise<{ data: JobImageDto }> {
  const data = await gqlRequest<{ confirmUpload: { image: JobImageDto } }>(
    `mutation ConfirmUpload($jobId: ID!, $key: String!, $kind: String, $label: String) {
       confirmUpload(jobId: $jobId, key: $key, kind: $kind, label: $label) {
         image { ${JOB_IMAGE_FIELDS} }
       }
     }`,
    input
  );
  return { data: data.confirmUpload.image };
}

/** Deletes a job image by ID. */
export async function deleteImage(imageId: string): Promise<{ data: { success: boolean } }> {
  const data = await gqlRequest<{ deleteImage: { success: boolean } }>(
    `mutation DeleteImage($imageId: ID!) { deleteImage(imageId: $imageId) { success } }`,
    { imageId }
  );
  return { data: data.deleteImage };
}

/** Creates an AI generation for a job image. */
export async function createAIGeneration(input: {
  jobId: string;
  sourceImageId: string;
  provider: string;
  prompt: string;
  metadata?: Record<string, unknown>;
}): Promise<{ data: AIGenerationDto }> {
  const data = await gqlRequest<{ createAiGeneration: { aiGeneration: AIGenerationDto } }>(
    `mutation CreateAiGeneration(
       $jobId: ID!, $sourceImageId: ID!, $prompt: String!, $provider: String, $metadata: JSONString
     ) {
       createAiGeneration(
         jobId: $jobId, sourceImageId: $sourceImageId, prompt: $prompt,
         provider: $provider, metadata: $metadata
       ) { aiGeneration { ${AI_GENERATION_FIELDS} } }
     }`,
    { ...input, metadata: input.metadata ? JSON.stringify(input.metadata) : undefined }
  );
  return { data: data.createAiGeneration.aiGeneration };
}

/** Generates AI email drafts for the given contractors on a job. */
export async function draftEmail(jobId: string, input: EmailDraftInput): Promise<{ data: EmailDraftDto[] }> {
  const data = await gqlRequest<{ draftEmail: { drafts: EmailDraftDto[] } }>(
    `mutation DraftEmail(
       $jobId: ID!, $contractorIds: [ID!]!, $tone: String,
       $includeImages: Boolean, $customInstructions: String
     ) {
       draftEmail(
         jobId: $jobId, contractorIds: $contractorIds, tone: $tone,
         includeImages: $includeImages, customInstructions: $customInstructions
       ) { drafts { contractorId subject bodyText bodyHtml } }
     }`,
    { jobId, ...input }
  );
  return { data: data.draftEmail.drafts };
}

/** Sends an email via the user's connected email integration. */
export async function sendEmail(jobId: string, input: SendEmailInput): Promise<{ data: CommunicationDto }> {
  const data = await gqlRequest<{ sendEmail: { communication: CommunicationDto } }>(
    `mutation SendEmail(
       $jobId: ID!, $integrationId: ID!, $to: String!, $subject: String!,
       $bodyText: String!, $bodyHtml: String, $contractorId: ID
     ) {
       sendEmail(
         jobId: $jobId, integrationId: $integrationId, to: $to, subject: $subject,
         bodyText: $bodyText, bodyHtml: $bodyHtml, contractorId: $contractorId
       ) { communication { ${COMMUNICATION_FIELDS} } }
     }`,
    { jobId, ...input }
  );
  return { data: data.sendEmail.communication };
}
