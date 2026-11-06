'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from '@/components/ui/Link';
import { useQuery } from '@apollo/client/react';
import { JobIntent, TradeCategory } from '@/graphql/types.generated';
import { WizardHomeDocument } from './queries/__generated__/WizardHome.generated';
import { EMPTY_WIZARD, STEP4_LABEL, type WizardData } from './types';
import { useJobDraft } from './useJobDraft';

import WizardProgress from './WizardProgress';
import Step1Intent from './Step1Intent';
import Step2Category from './Step2Category';
import Step3Describe from './Step3Describe';
import Step4Diagnose from './Step4Diagnose';
import type { AiSessionSummary } from '@/types/api';
import Step5Contractors from './Step5Contractors';


export default function NewJobWizardPage() {
  const { homeId } = useParams<{ homeId: string }>();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [data, setData] = useState<WizardData>(EMPTY_WIZARD);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const homeZipCode = useQuery(WizardHomeDocument, { variables: { homeId } }).data?.home?.zipCode;
  const homeZipCodes = homeZipCode ? [homeZipCode] : [];
  const jobDraft = useJobDraft();

  function update(fields: Partial<WizardData>) {
    setData((prev) => ({ ...prev, ...fields }));
  }

  // Step 1 → 2: select intent
  function handleSelectIntent(intent: JobIntent) {
    update({ intent, category: null, categories: [], categorySuggestions: [] });
    setStep(2);
  }

  // Step 2 → 3: select category (ISSUE, RECURRING_WORK)
  function handleSelectCategory(category: TradeCategory) {
    update({ category });
    setStep(3);
  }

  // Step 2 → 3: select categories (IMPROVEMENT, multi-select)
  function handleSelectCategories(categories: TradeCategory[]) {
    update({ categories });
    setStep(3);
  }

  // Step 3 → 4: create job + upload photos, then start diagnostic
  async function handleStep3Next() {
    setSubmitting(true);
    setError('');
    try {
      const jobId = await jobDraft.create({
        homeId,
        categories: data.categories,
        category: data.category ?? data.categories[0],
        description: data.description,
        intent: data.intent,
        photos: data.photos,
        title: data.title,
      });
      update({ jobId });
      setStep(4);
    } catch (err: any) {
      setError(err.message || 'Failed to save. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // Step 4 → 5: if AI suggested categories, patch the job with the confirmed ones
  async function handleStep4Next(
    summary: AiSessionSummary | null,
    confirmedCategories: Array<{ category: TradeCategory; reason: string }> | null,
  ) {
    update({ aiSummary: summary });

    if (confirmedCategories && confirmedCategories.length > 0 && data.jobId) {
      const categoryValues = confirmedCategories.map(c => c.category);
      setSubmitting(true);
      setError('');
      try {
        await jobDraft.setCategories(data.jobId, categoryValues);
        update({ category: categoryValues[0], categories: categoryValues, categorySuggestions: confirmedCategories });
      } catch (err: any) {
        setError(err.message || 'Failed to update categories.');
        return;
      } finally {
        setSubmitting(false);
      }
    }

    setStep(5);
  }

  // Step 5: assign contractors + finalise
  async function handleSubmit() {
    if (!data.jobId || data.selectedContractorIds.length === 0) return;
    setSubmitting(true);
    setError('');
    try {
      await jobDraft.sendOut(data.jobId, data.selectedContractorIds);

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
      selectedContractorIds: ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id],
    });
  }

  const step4Label = data.intent ? STEP4_LABEL[data.intent] : 'Diagnose';
  const stepLabels = ['Intent', 'Category', 'Describe', step4Label, 'Contractors'];
  const effectiveCategory = data.category ?? data.categories[0] ?? null;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <Link
          variant="subtle"
          href={`/homes/${homeId}`}
        >
          ← Cancel
        </Link>
        <span className="text-sm text-gray-400">New Request</span>
      </div>

      {step > 1 && <WizardProgress currentStep={step} totalSteps={5} labels={stepLabels} />}

      {step === 1 && <Step1Intent onSelect={handleSelectIntent} />}

      {step === 2 && data.intent && (
        <Step2Category
          intent={data.intent}
          onSelect={handleSelectCategory}
          onSelectMultiple={handleSelectCategories}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && data.intent && effectiveCategory && (
        <Step3Describe
          intent={data.intent}
          category={effectiveCategory}
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

      {step === 4 && data.intent && data.jobId && (
        <Step4Diagnose
          intent={data.intent}
          jobId={data.jobId}
          onNext={handleStep4Next}
          onBack={() => setStep(3)}
        />
      )}

      {step === 5 && data.intent && effectiveCategory && data.jobId && (
        <Step5Contractors
          categories={data.categories.length ? data.categories : [effectiveCategory]}
          zipCodes={homeZipCodes}
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
