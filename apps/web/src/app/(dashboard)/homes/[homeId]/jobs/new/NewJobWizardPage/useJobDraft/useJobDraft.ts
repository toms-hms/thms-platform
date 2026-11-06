import { useMutation } from '@apollo/client/react';
import { JobIntent, JobStatus, TradeCategory } from '@/graphql/types.generated';
import { CreateJobDocument } from './mutations/__generated__/CreateJob.generated';
import { WizardCreateJobContractorDocument } from './mutations/__generated__/WizardCreateJobContractor.generated';
import { WizardCreateJobImageDocument } from './mutations/__generated__/WizardCreateJobImage.generated';
import { WizardUpdateJobDocument } from './mutations/__generated__/WizardUpdateJob.generated';
import { WizardUploadUrlDocument } from './mutations/__generated__/WizardUploadUrl.generated';

export interface NewJobDraft {
  categories: TradeCategory[];
  category: TradeCategory;
  description: string;
  homeId: string;
  intent: JobIntent | null;
  photos: File[];
  title: string;
}

/** The wizard's writes: create the draft job with its photos, confirm categories, then send it out. */
export function useJobDraft() {
  const [createJob] = useMutation(CreateJobDocument);
  const [createJobContractor] = useMutation(WizardCreateJobContractorDocument);
  const [createJobImage] = useMutation(WizardCreateJobImageDocument);
  const [requestUploadUrl] = useMutation(WizardUploadUrlDocument);
  const [updateJob] = useMutation(WizardUpdateJobDocument);

  /** Uploads one photo: presigned URL, direct PUT, then the image row. */
  async function uploadPhoto(jobId: string, file: File) {
    const { data } = await requestUploadUrl({
      variables: { jobId, contentType: file.type, fileName: file.name, kind: 'SOURCE' },
    });
    const upload = data?.requestUploadUrl?.upload;
    if (!upload) throw new Error('Upload failed');
    await fetch(upload.uploadUrl, { body: file, headers: { 'Content-Type': file.type }, method: 'PUT' });
    await createJobImage({ variables: { jobId, key: upload.key, kind: 'SOURCE', label: file.name } });
  }

  /** Creates the job as a DRAFT, uploads its photos, and returns its id. */
  async function create(draft: NewJobDraft): Promise<string> {
    const { data } = await createJob({
      variables: {
        homeId: draft.homeId,
        category: draft.category,
        title: draft.title,
        categories: draft.categories.length ? draft.categories : undefined,
        description: draft.description || undefined,
        intent: draft.intent ?? undefined,
        status: JobStatus.DRAFT,
      },
    });
    const jobId = data?.createJob?.job?.id;
    if (!jobId) throw new Error('Failed to save. Please try again.');
    for (const photo of draft.photos) await uploadPhoto(jobId, photo);
    return jobId;
  }

  /** Replaces the job's categories with the ones the user confirmed; the first is the primary one. */
  async function setCategories(jobId: string, categories: TradeCategory[]) {
    await updateJob({ variables: { jobId, categories, category: categories[0] } });
  }

  /** Assigns the chosen contractors and moves the job to REACHING_OUT. */
  async function sendOut(jobId: string, contractorIds: string[]) {
    await Promise.all(contractorIds.map((contractorId) => createJobContractor({ variables: { contractorId, jobId } })));
    await updateJob({ variables: { jobId, status: JobStatus.REACHING_OUT } });
  }

  return { create, sendOut, setCategories };
}
