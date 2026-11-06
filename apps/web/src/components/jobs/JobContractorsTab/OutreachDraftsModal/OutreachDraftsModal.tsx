'use client';
import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import { JobDetailDocument } from '@/components/jobs/queries/__generated__/JobDetail.generated';
import type { EmailDraft, JobContractorRow } from '../types';
import { SendEmailDocument } from './mutations/__generated__/SendEmail.generated';
import { EmailIntegrationsDocument } from './queries/__generated__/EmailIntegrations.generated';

interface OutreachDraftsModalProps {
  contractors: JobContractorRow[];
  /** The drafts to review and send, or `null` when the modal is closed. */
  drafts: EmailDraft[] | null;
  jobId: string;
  onClose: () => void;
  /** Called after one draft is sent, so it can drop out of the list. */
  onSent: (contractorId: string) => void;
}

/** Reviews AI-drafted outreach emails and sends each through one of the user's email integrations. */
export default function OutreachDraftsModal({ contractors, drafts, jobId, onClose, onSent }: OutreachDraftsModalProps) {
  const integrations = (useQuery(EmailIntegrationsDocument).data?.integrations ?? []).filter((i) => i.type === 'EMAIL');
  const [sendEmail] = useMutation(SendEmailDocument, { refetchQueries: [JobDetailDocument] });
  const [integrationId, setIntegrationId] = useState('');
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  async function send(draft: EmailDraft) {
    if (!integrationId) {
      alert('Select an email integration first');
      return;
    }
    const contractor = contractors.find((jc) => jc.contractor.id === draft.contractorId)?.contractor;
    setSendingTo(draft.contractorId);
    try {
      await sendEmail({
        variables: {
          integrationId,
          jobId,
          bodyText: draft.bodyText,
          subject: draft.subject,
          to: contractor?.email || '',
          contractorId: draft.contractorId,
          bodyHtml: draft.bodyHtml,
        },
      });
      alert('Email sent!');
      onSent(draft.contractorId);
    } catch (err: any) {
      alert(err.message || 'Failed to send');
    }
    setSendingTo(null);
  }

  return (
    <Modal onClose={onClose} open={drafts !== null} title="Outreach Email Drafts">
      <div className="space-y-4">
        {integrations.length > 0 && (
          <Field label="Send via">
            <Select onChange={(e) => setIntegrationId(e.target.value)} value={integrationId}>
              <option value="">-- Select integration --</option>
              {integrations.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.provider} – {i.email}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {(drafts ?? []).map((draft) => {
          const contractor = contractors.find((jc) => jc.contractor.id === draft.contractorId)?.contractor;
          return (
            <div className="border border-gray-200 rounded-lg p-4 space-y-2" key={draft.contractorId}>
              <p className="font-medium text-gray-900">To: {contractor?.name}</p>
              <p className="text-sm font-medium text-gray-700">{draft.subject}</p>
              <p className="text-xs text-gray-500 whitespace-pre-wrap line-clamp-5">{draft.bodyText}</p>
              <Button
                className="text-sm"
                disabled={sendingTo === draft.contractorId || !integrationId}
                onClick={() => send(draft)}
                variant="primary"
              >
                {sendingTo === draft.contractorId ? 'Sending...' : 'Send Email'}
              </Button>
            </div>
          );
        })}

        {drafts?.length === 0 && <p className="text-sm text-gray-500 text-center py-4">All emails have been sent.</p>}
      </div>
    </Modal>
  );
}
