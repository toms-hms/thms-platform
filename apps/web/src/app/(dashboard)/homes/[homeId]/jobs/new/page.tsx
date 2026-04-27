'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { JobIntent, TradeCategory } from '@thms/shared';
import { request } from '@/lib/api';

import WizardProgress from './_components/WizardProgress';
import Step1Intent from './_components/Step1Intent';
import Step2Category from './_components/Step2Category';
import Step3Describe from './_components/Step3Describe';
import Step4Diagnose from './_components/Step4Diagnose';
import Step5Contractors from './_components/Step5Contractors';

const STEP_LABELS = ['Intent', 'Category', 'Describe', 'Diagnose', 'Contractors'];

interface WizardData {
  intent: JobIntent | null;
  category: TradeCategory | null;
  title: string;
  description: string;
  photos: File[];
  jobId: string | null;
  selectedContractorIds: string[];
}

async function uploadPhoto(jobId: string, file: File) {
  const urlRes = await request<{ data: { uploadUrl: string; key: string } }>(
    `/api/v1/jobs/${jobId}/images/upload-url`,
    { method: 'POST', body: JSON.stringify({ fileName: file.name, contentType: file.type, kind: 'SOURCE' }) }
  );
  await fetch(urlRes.data.uploadUrl, {
    method: 'PUT', body: file, headers: { 'Content-Type': file.type },
  });
  await request(`/api/v1/jobs/${jobId}/images/confirm`, {
    method: 'POST', body: JSON.stringify({ key: urlRes.data.key, kind: 'SOURCE', label: file.name }),
  });
}

export default function NewJobWizardPage() {
  const { homeId } = useParams<{ homeId: string }>();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [data, setData] = useState<WizardData>({
    intent: null, category: null,
    title: '', description: '', photos: [],
    jobId: null, selectedContractorIds: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function update(fields: Partial<WizardData>) {
    setData(prev => ({ ...prev, ...fields }));
  }

  // Step 1 → 2: select intent
  function handleSelectIntent(intent: JobIntent) {
    update({ intent, category: null });
    setStep(2);
  }

  // Step 2 → 3: select category
  function handleSelectCategory(category: TradeCategory) {
    update({ category });
    setStep(3);
  }

  // Step 3 → 4: create job + upload photos
  async function handleStep3Next() {
    setSubmitting(true);
    setError('');
    try {
      // Create job as DRAFT
      const res = await request<{ data: any }>(
        `/api/v1/homes/${homeId}/jobs`,
        {
          method: 'POST',
          body: JSON.stringify({
            title: data.title,
            intent: data.intent,
            category: data.category,
            description: data.description || undefined,
            status: 'DRAFT',
          }),
        }
      );
      const jobId = res.data.id;
      update({ jobId });

      // Upload photos against the new job ID
      for (const file of data.photos) {
        await uploadPhoto(jobId, file);
      }

      setStep(4);
    } catch (err: any) {
      setError(err.message || 'Failed to save. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // Step 4 → 5: skip AI
  function handleStep4Next() {
    setStep(5);
  }

  // Step 5: assign contractors + finalise
  async function handleSubmit() {
    if (!data.jobId || data.selectedContractorIds.length === 0) return;
    setSubmitting(true);
    setError('');
    try {
      // Assign each selected contractor
      await Promise.all(
        data.selectedContractorIds.map(contractorId =>
          request(`/api/v1/jobs/${data.jobId}/contractors`, {
            method: 'POST',
            body: JSON.stringify({ contractorId }),
          })
        )
      );

      // Transition job to REACHING_OUT
      await request(`/api/v1/jobs/${data.jobId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'REACHING_OUT' }),
      });

      router.push(`/homes/${homeId}/jobs/${data.jobId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function toggleContractor(id: string) {
    const ids = data.selectedContractorIds;
    update({
      selectedContractorIds: ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id],
    });
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <Link href={`/homes/${homeId}`} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          ← Cancel
        </Link>
        <span className="text-sm text-gray-400">New Request</span>
      </div>

      <WizardProgress currentStep={step} totalSteps={5} labels={STEP_LABELS} />

      {step === 1 && (
        <Step1Intent onSelect={handleSelectIntent} />
      )}

      {step === 2 && data.intent && (
        <Step2Category
          intent={data.intent}
          onSelect={handleSelectCategory}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && data.intent && data.category && (
        <Step3Describe
          intent={data.intent}
          category={data.category}
          title={data.title}
          description={data.description}
          photos={data.photos}
          onUpdate={update}
          onNext={handleStep3Next}
          onBack={() => setStep(2)}
          submitting={submitting}
          error={error}
        />
      )}

      {step === 4 && (
        <Step4Diagnose
          onNext={handleStep4Next}
          onBack={() => setStep(3)}
        />
      )}

      {step === 5 && data.intent && data.category && (
        <Step5Contractors
          intent={data.intent}
          category={data.category}
          selectedIds={data.selectedContractorIds}
          onToggle={toggleContractor}
          onSubmit={handleSubmit}
          onBack={() => setStep(4)}
          submitting={submitting}
          error={error}
        />
      )}
    </div>
  );
}
