'use client';
import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import type { JobDetail } from '@/components/jobs/types';
import AddJobContractorModal from './AddJobContractorModal';
import JobContractorCard from './JobContractorCard';
import OutreachDraftsModal from './OutreachDraftsModal';
import { DraftEmailDocument } from './mutations/__generated__/DraftEmail.generated';
import type { EmailDraft } from './types';

/** The contractors on a job: their outreach status, adding more, and AI-drafted outreach emails. */
export default function JobContractorsTab({ job }: { job: JobDetail }) {
  const [adding, setAdding] = useState(false);
  const [drafts, setDrafts] = useState<EmailDraft[] | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [draftEmail] = useMutation(DraftEmailDocument);

  async function handleDraftEmails() {
    const uncontacted = job.contractors.filter((jc) => jc.status === 'NOT_CONTACTED').slice(0, 3);
    if (uncontacted.length === 0) {
      alert('No uncontacted contractors to draft for.');
      return;
    }
    setDrafting(true);
    try {
      const { data } = await draftEmail({
        variables: {
          contractorIds: uncontacted.map((jc) => jc.contractor.id),
          jobId: job.id,
          customInstructions: '',
          includeImages: false,
          tone: 'professional',
        },
      });
      setDrafts(data?.draftEmail?.drafts ?? []);
    } catch (err: any) {
      alert(err.message || 'Failed to generate drafts');
    }
    setDrafting(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-800">Contractors</h3>
        <div className="flex gap-2">
          <Button className="text-sm" disabled={drafting} onClick={handleDraftEmails} variant="secondary">
            {drafting ? 'Generating...' : 'Draft Outreach Emails'}
          </Button>
          <Button className="text-sm" onClick={() => setAdding(true)} variant="primary">
            + Add Contractor
          </Button>
        </div>
      </div>

      {job.contractors.length === 0 ? (
        <EmptyState description="Add contractors to track outreach and quotes." title="No contractors yet" />
      ) : (
        <div className="space-y-3">
          {job.contractors.map((jobContractor) => (
            <JobContractorCard jobContractor={jobContractor} key={jobContractor.id} />
          ))}
        </div>
      )}

      <AddJobContractorModal job={job} onClose={() => setAdding(false)} open={adding} />
      <OutreachDraftsModal
        contractors={job.contractors}
        drafts={drafts}
        jobId={job.id}
        onClose={() => setDrafts(null)}
        onSent={(contractorId) => setDrafts((prev) => prev?.filter((d) => d.contractorId !== contractorId) ?? null)}
      />
    </div>
  );
}
