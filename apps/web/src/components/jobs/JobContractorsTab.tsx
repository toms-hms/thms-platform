'use client';
import { useState, useEffect, FormEvent } from 'react';
import { listContractors, listIntegrations } from './queries';
import { assignContractor, updateContractorStatus, removeContractor, draftEmail, sendEmail } from './mutations';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';

const CONTRACTOR_STATUSES = [
  'NOT_CONTACTED', 'CONTACTED', 'RESPONDED', 'VISIT_REQUESTED', 'VISIT_SCHEDULED',
  'VISIT_COMPLETED', 'QUOTE_RECEIVED', 'DECLINED', 'ACCEPTED',
  'WORK_IN_PROGRESS', 'WORK_COMPLETED', 'PAID',
];

interface Props {
  job: any;
}

export default function JobContractorsTab({ job }: Props) {
  const [jcs, setJcs] = useState<any[]>(job.contractors || []);
  const [allContractors, setAllContractors] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showEmailDraft, setShowEmailDraft] = useState(false);
  const [selectedContractorId, setSelectedContractorId] = useState('');
  const [saving, setSaving] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [emailDrafts, setEmailDrafts] = useState<any[]>([]);
  const [integrationsList, setIntegrationsList] = useState<any[]>([]);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [selectedIntegration, setSelectedIntegration] = useState('');
  const [emailNotes, setEmailNotes] = useState('');

  useEffect(() => {
    listContractors().then((r) => setAllContractors(r.data)).catch(() => {});
    listIntegrations().then((r) => setIntegrationsList(r.data)).catch(() => {});
  }, []);

  const attachedIds = new Set(jcs.map((jc) => jc.contractorId));
  const available = allContractors.filter((c) => !attachedIds.has(c.id));

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!selectedContractorId) return;
    setSaving(true);
    try {
      const res = await assignContractor(job.id, { contractorId: selectedContractorId });
      setJcs((prev) => [...prev, res.data]);
      setShowAdd(false);
      setSelectedContractorId('');
    } catch {}
    setSaving(false);
  }

  async function handleStatusChange(jc: any, status: string) {
    try {
      const res = await updateContractorStatus(job.id, jc.id, { status });
      setJcs((prev) => prev.map((j) => (j.id === jc.id ? res.data : j)));
    } catch {}
  }

  async function handleRemove(jcId: string) {
    if (!confirm('Remove contractor from this job?')) return;
    try {
      await removeContractor(job.id, jcId);
      setJcs((prev) => prev.filter((j) => j.id !== jcId));
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
      const res = await draftEmail(job.id, {
        contractorIds: selected.map((jc) => jc.contractorId),
        tone: 'professional',
        includeImages: false,
        customInstructions: emailNotes,
      });
      setEmailDrafts(res.data);
      setShowEmailDraft(true);
    } catch (err: any) {
      alert(err.message || 'Failed to generate drafts');
    }
    setDraftLoading(false);
  }

  async function sendDraft(draft: any) {
    if (!selectedIntegration) {
      alert('Select an email integration first');
      return;
    }
    const jc = jcs.find((j) => j.contractorId === draft.contractorId);
    setSendingEmail(draft.contractorId);
    try {
      await sendEmail(job.id, {
        contractorId: draft.contractorId,
        integrationId: selectedIntegration,
        to: jc?.contractor?.email || '',
        subject: draft.subject,
        bodyText: draft.bodyText,
        bodyHtml: draft.bodyHtml,
      });
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
                {emailIntegrations.map((i: any) => (
                  <option key={i.id} value={i.id}>
                    {i.provider} – {i.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          {emailDrafts.map((draft) => {
            const ctr = jcs.find((jc) => jc.contractorId === draft.contractorId)?.contractor;
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
