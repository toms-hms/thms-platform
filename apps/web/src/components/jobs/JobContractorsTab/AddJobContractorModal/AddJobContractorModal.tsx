'use client';
import { useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import { JobDetailDocument } from '@/components/jobs/queries/__generated__/JobDetail.generated';
import type { JobDetail } from '@/components/jobs/types';
import { CreateJobContractorDocument } from './mutations/__generated__/CreateJobContractor.generated';
import { JobContractorPickerDocument } from './queries/__generated__/JobContractorPicker.generated';

interface AddJobContractorModalProps {
  job: JobDetail;
  onClose: () => void;
  open: boolean;
}

/** Picks a contractor from the directory, among those not already on the job, and adds them. */
export default function AddJobContractorModal({ job, onClose, open }: AddJobContractorModalProps) {
  const contractors = useQuery(JobContractorPickerDocument).data?.contractors ?? [];
  const [createJobContractor] = useMutation(CreateJobContractorDocument, { refetchQueries: [JobDetailDocument] });
  const [contractorId, setContractorId] = useState('');
  const [saving, setSaving] = useState(false);
  const attachedIds = new Set(job.contractors.map((jc) => jc.contractor.id));
  const available = contractors.filter((c) => !attachedIds.has(c.id));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!contractorId) return;
    setSaving(true);
    try {
      await createJobContractor({ variables: { contractorId, jobId: job.id } });
      setContractorId('');
      onClose();
    } catch {}
    setSaving(false);
  }

  return (
    <Modal onClose={onClose} open={open} title="Add Contractor to Job">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field label="Select Contractor">
          <Select onChange={(e) => setContractorId(e.target.value)} required value={contractorId}>
            <option value="">-- Select --</option>
            {available.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.companyName ? ` (${c.companyName})` : ''}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex gap-3 justify-end">
          <Button onClick={onClose} variant="secondary">Cancel</Button>
          <Button disabled={saving} type="submit" variant="primary">{saving ? 'Adding...' : 'Add'}</Button>
        </div>
      </form>
    </Modal>
  );
}
