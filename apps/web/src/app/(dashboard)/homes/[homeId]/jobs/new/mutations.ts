import { gqlRequest } from '@/lib/graphql';
import type { DiagnoseResult } from '@/types/api';

const DIAGNOSE_FIELDS = `question options summary suggestedCategories { category reason } messages`;

interface DiagnosePayload {
  question: string | null;
  options: string[];
  summary: string | null;
  suggestedCategories: DiagnoseResult['suggestedCategories'];
  messages: string;
}

/** Parses the JSON-encoded fields the diagnose mutations return. */
function toResult(payload: DiagnosePayload): DiagnoseResult {
  return {
    question: payload.question,
    options: payload.options,
    summary: payload.summary ? JSON.parse(payload.summary) : null,
    suggestedCategories: payload.suggestedCategories,
    messages: payload.messages ? JSON.parse(payload.messages) : [],
  };
}

/** Opens the AI diagnostic session for a job and returns its first question. */
export async function startDiagnose(jobId: string): Promise<{ data: DiagnoseResult }> {
  const data = await gqlRequest<{ startDiagnose: { result: DiagnosePayload } }>(
    `mutation StartDiagnose($jobId: ID!) { startDiagnose(jobId: $jobId) { result { ${DIAGNOSE_FIELDS} } } }`,
    { jobId }
  );
  return { data: toResult(data.startDiagnose.result) };
}

/** Answers the current diagnostic question and returns the assistant's next turn. */
export async function answerDiagnose(jobId: string, message: string): Promise<{ data: DiagnoseResult }> {
  const data = await gqlRequest<{ diagnoseJob: { result: DiagnosePayload } }>(
    `mutation DiagnoseJob($jobId: ID!, $message: String!) {
       diagnoseJob(jobId: $jobId, message: $message) { result { ${DIAGNOSE_FIELDS} } }
     }`,
    { jobId, message }
  );
  return { data: toResult(data.diagnoseJob.result) };
}

/** Uploads a photo for a job: presigned URL, direct PUT, then confirmation. */
export async function uploadJobPhoto(jobId: string, file: File): Promise<void> {
  const upload = await gqlRequest<{ requestUploadUrl: { upload: { uploadUrl: string; key: string } } }>(
    `mutation WizardUploadUrl($jobId: ID!, $fileName: String!, $contentType: String!, $kind: String!) {
       requestUploadUrl(jobId: $jobId, fileName: $fileName, contentType: $contentType, kind: $kind) {
         upload { uploadUrl key }
       }
     }`,
    { jobId, fileName: file.name, contentType: file.type, kind: 'SOURCE' }
  );

  await fetch(upload.requestUploadUrl.upload.uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });

  await gqlRequest(
    `mutation WizardConfirmUpload($jobId: ID!, $key: String!, $kind: String, $label: String) {
       confirmUpload(jobId: $jobId, key: $key, kind: $kind, label: $label) { image { id } }
     }`,
    { jobId, key: upload.requestUploadUrl.upload.key, kind: 'SOURCE', label: file.name }
  );
}
