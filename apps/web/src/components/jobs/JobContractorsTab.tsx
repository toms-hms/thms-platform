'use client';
import { useState, FormEvent } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import type { JobContractorStatus } from '@/graphql/types.generated';
import { JobContractorPickerDocument } from './JobContractorPicker.generated';
import { EmailIntegrationsDocument } from './EmailIntegrations.generated';
import { AssignContractorDocument } from './AssignContractor.generated';
import { UpdateJobContractorDocument } from './UpdateJobContractor.generated';
import { RemoveJobContractorDocument } from './RemoveJobContractor.generated';
import { DraftEmailDocument, type DraftEmailMutation } from './DraftEmail.generated';
import { SendEmailDocument } from './SendEmail.generated';
import { JobDetailDocument } from './JobDetail.generated';
import type { JobDetail } from './types';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';

const CONTRACTOR_STATUSES = [
  'NOT_CONTACTED', 'CONTACTED', 'RESPONDED', 'VISIT_REQUESTED', 'VISIT_SCHEDULED',
  'VISIT_COMPLETED', 'QUOTE_RECEIVED', 'DECLINED', 'ACCEPTED',
  'WORK_IN_PROGRESS', 'WORK_COMPLETED', 'PAID',
];

type EmailDraft = NonNullable<DraftEmailMutation['draftEmail']>['drafts'][number];

interface Props {
  job: JobDetail;
}

export default function JobContractorsTab({ job }: Props) {
  const jcs = job.contractors;
  const allContractors = useQuery(JobContractorPickerDocument).data?.contractors ?? [];
  const integrationsList = useQuery(EmailIntegrationsDocument).data?.integrations ?? [];
  const refetchQueries = [JobDetailDocument];
  const [assignContractor] = useMutation(AssignContractorDocument, { refetchQueries });
  const [updateJobContractor] = useMutation(UpdateJobContractorDocument);
  const [removeJobContractor] = useMutation(RemoveJobContractorDocument, { refetchQueries });
  const [draftEmail] = useMutation(DraftEmailDocument);
  const [sendEmail] = useMutation(SendEmailDocument, { refetchQueries });
  const [showAdd, setShowAdd] = useState(false);
  const [showEmailDraft, setShowEmailDraft] = useState(false);
  const [selectedContractorId, setSelectedContractorId] = useState('');
  const [saving, setSaving] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [emailDrafts, setEmailDrafts] = useState<EmailDraft[]>([]);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [selectedIntegration, setSelectedIntegration] = useState('');
  const [emailNotes, setEmailNotes] = useState('');

  const attachedIds = new Set(jcs.map((jc) => jc.contractor.id));
  const available = allContractors.filter((c) => !attachedIds.has(c.id));

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!selectedContractorId) return;
    setSaving(true);
    try {
      await assignContractor({ variables: { jobId: job.id, contractorId: selectedContractorId } });
      setShowAdd(false);
      setSelectedContractorId('');
    } catch {}
    setSaving(false);
  }

  async function handleStatusChange(jc: JobDetail['contractors'][number], status: string) {
    try {
      await updateJobContractor({ variables: { jobContractorId: jc.id, status: status as JobContractorStatus } });
    } catch {}
  }

  async function handleRemove(jcId: string) {
    if (!confirm('Remove contractor from this job?')) return;
    try {
      await removeJobContractor({ variables: { jobContractorId: jcId } });
    } catch {}
  }

  async function handleGenerateDrafts() {
    const selected = jcs.filter((jc) => jc.status === 'NOT_CONTACTED').slice(0, 3);
    if (selected.length === 0) {
      alert('No uncontacted contractors to draft for.');
      return;
    }
    setDraftLoading(true);
    try {
      const { data } = await draftEmail({ variables: {
        jobId: job.id,
        contractorIds: selected.map((jc) => jc.contractor.id),
        tone: 'professional',
        includeImages: false,
        customInstructions: emailNotes,
      } });
      setEmailDrafts(data?.draftEmail?.drafts ?? []);
      setShowEmailDraft(true);
    } catch (err: any) {
      alert(err.message || 'Failed to generate drafts');
    }
    setDraftLoading(false);
  }

  async function sendDraft(draft: EmailDraft) {
    if (!selectedIntegration) {
      alert('Select an email integration first');
      return;
    }
    const jc = jcs.find((j) => j.contractor.id === draft.contractorId);
    setSendingEmail(draft.contractorId);
    try {
      await sendEmail({ variables: {
        jobId: job.id,
        contractorId: draft.contractorId,
        integrationId: selectedIntegration,
        to: jc?.contractor?.email || '',
        subject: draft.subject,
        bodyText: draft.bodyText,
        bodyHtml: draft.bodyHtml,
      } });
      alert('Email sent!');
      setEmailDrafts((prev) => prev.filter((d) => d.contractorId !== draft.contractorId));
    } catch (err: any) {
      alert(err.message || 'Failed to send');
    }
    setSendingEmail(null);
  }

  const emailIntegrations = integrationsList.filter((i) => i.type === 'EMAIL');

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-800">Contractors</h3>
        <div className="flex gap-2">
          <button
            onClick={handleGenerateDrafts}
            disabled={draftLoading}
            className="btn-secondary text-sm"
          >
            {draftLoading ? 'Generating...' : 'Draft Outreach Emails'}
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">
            + Add Contractor
          </button>
        </div>
      </div>

      {jcs.length === 0 ? (
        <EmptyState
          title="No contractors yet"
          description="Add contractors to track outreach and quotes."
        />
      ) : (
        <div className="space-y-3">
          {jcs.map((jc) => (
            <div key={jc.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900">{jc.contractor?.name}</p>
                  {jc.contractor?.companyName && (
                    <p className="text-sm text-gray-500">{jc.contractor.companyName}</p>
                  )}
                  {jc.contractor?.email && (
                    <p className="text-xs text-gray-400">{jc.contractor.email}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={jc.status}
                    onChange={(e) => handleStatusChange(jc, e.target.value)}
                    className="input text-xs py-1 w-auto"
                  >
                    {CONTRACTOR_STATUSES.map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleRemove(jc.id)}
                    className="text-gray-400 hover:text-red-500 text-sm"
                  >
                    ✕
                  </button>
                </div>
              </div>
              {jc.notes && <p className="text-xs text-gray-400 mt-2">{jc.notes}</p>}
              <div className="mt-1 flex gap-4 text-xs text-gray-400">
                {jc.lastContactedAt && (
                  <span>Contacted: {new Date(jc.lastContactedAt).toLocaleDateString()}</span>
                )}
                {jc.lastResponseAt && (
                  <span>Responded: {new Date(jc.lastResponseAt).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal title="Add Contractor to Job" open={showAdd} onClose={() => setShowAdd(false)}>
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="label">Select Contractor</label>
            <select
              className="input"
              value={selectedContractorId}
              onChange={(e) => setSelectedContractorId(e.target.value)}
              required
            >
              <option value="">-- Select --</option>
              {available.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.companyName ? ` (${c.companyName})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Adding...' : 'Add'}</button>
          </div>
        </form>
      </Modal>

      <Modal
        title="Outreach Email Drafts"
        open={showEmailDraft}
        onClose={() => setShowEmailDraft(false)}
      >
        <div className="space-y-4">
          {emailIntegrations.length > 0 && (
            <div>
              <label className="label">Send via</label>
              <select
                className="input"
                value={selectedIntegration}
                onChange={(e) => setSelectedIntegration(e.target.value)}
              >
                <option value="">-- Select integration --</option>
                {emailIntegrations.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.provider} – {i.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          {emailDrafts.map((draft) => {
            const ctr = jcs.find((jc) => jc.contractor.id === draft.contractorId)?.contractor;
            return (
              <div key={draft.contractorId} className="border border-gray-200 rounded-lg p-4 space-y-2">
                <p className="font-medium text-gray-900">To: {ctr?.name}</p>
                <p className="text-sm font-medium text-gray-700">{draft.subject}</p>
                <p className="text-xs text-gray-500 whitespace-pre-wrap line-clamp-5">{draft.bodyText}</p>
                <button
                  onClick={() => sendDraft(draft)}
                  disabled={sendingEmail === draft.contractorId || !selectedIntegration}
                  className="btn-primary text-sm"
                >
                  {sendingEmail === draft.contractorId ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            );
          })}

          {emailDrafts.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">All emails have been sent.</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
