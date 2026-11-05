'use client';
import { useState, FormEvent } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import type { JobContractorStatus } from '@/graphql/types.generated';
import { JobContractorPickerDocument } from './queries/__generated__/JobContractorPicker.generated';
import { EmailIntegrationsDocument } from './queries/__generated__/EmailIntegrations.generated';
import { CreateJobContractorDocument } from './mutations/__generated__/CreateJobContractor.generated';
import { UpdateJobContractorDocument } from './mutations/__generated__/UpdateJobContractor.generated';
import { DeleteJobContractorDocument } from './mutations/__generated__/DeleteJobContractor.generated';
import { DraftEmailDocument, type DraftEmailMutation } from './mutations/__generated__/DraftEmail.generated';
import { SendEmailDocument } from './mutations/__generated__/SendEmail.generated';
import { JobDetailDocument } from './queries/__generated__/JobDetail.generated';
import type { JobDetail } from './types';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import Select from '@/components/ui/Select';
import Card from '@/components/ui/Card';

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
  const [createJobContractor] = useMutation(CreateJobContractorDocument, { refetchQueries });
  const [updateJobContractor] = useMutation(UpdateJobContractorDocument);
  const [deleteJobContractor] = useMutation(DeleteJobContractorDocument, { refetchQueries });
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
      await createJobContractor({ variables: { jobId: job.id, contractorId: selectedContractorId } });
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
      await deleteJobContractor({ variables: { jobContractorId: jcId } });
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
          <Button
            variant="secondary"
            onClick={handleGenerateDrafts}
            disabled={draftLoading}
            className="text-sm"
          >
            {draftLoading ? 'Generating...' : 'Draft Outreach Emails'}
          </Button>
          <Button variant="primary" onClick={() => setShowAdd(true)} className="text-sm">
            + Add Contractor
          </Button>
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
            <Card key={jc.id} className="p-4">
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
                  <Select
                    value={jc.status}
                    onChange={(e) => handleStatusChange(jc, e.target.value)}
                    className="text-xs py-1 w-auto"
                  >
                    {CONTRACTOR_STATUSES.map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                    ))}
                  </Select>
                  <Button
                    variant="bare"
                    onClick={() => handleRemove(jc.id)}
                    className="text-gray-400 hover:text-red-500 text-sm"
                  >
                    ✕
                  </Button>
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
            </Card>
          ))}
        </div>
      )}

      <Modal title="Add Contractor to Job" open={showAdd} onClose={() => setShowAdd(false)}>
        <form onSubmit={handleAdd} className="space-y-4">
          <Field label="Select Contractor">
            <Select
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
            </Select>
          </Field>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={saving}>{saving ? 'Adding...' : 'Add'}</Button>
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
            <Field label="Send via">
              <Select
                value={selectedIntegration}
                onChange={(e) => setSelectedIntegration(e.target.value)}
              >
                <option value="">-- Select integration --</option>
                {emailIntegrations.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.provider} – {i.email}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {emailDrafts.map((draft) => {
            const ctr = jcs.find((jc) => jc.contractor.id === draft.contractorId)?.contractor;
            return (
              <div key={draft.contractorId} className="border border-gray-200 rounded-lg p-4 space-y-2">
                <p className="font-medium text-gray-900">To: {ctr?.name}</p>
                <p className="text-sm font-medium text-gray-700">{draft.subject}</p>
                <p className="text-xs text-gray-500 whitespace-pre-wrap line-clamp-5">{draft.bodyText}</p>
                <Button
                  variant="primary"
                  onClick={() => sendDraft(draft)}
                  disabled={sendingEmail === draft.contractorId || !selectedIntegration}
                  className="text-sm"
                >
                  {sendingEmail === draft.contractorId ? 'Sending...' : 'Send Email'}
                </Button>
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
