'use client';
import { useEffect } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import Form from '@/components/ui/Form';
import FormActions from '@/components/ui/FormActions';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import SubmitButton from '@/components/ui/SubmitButton';
import { JobDetailDocument } from '@/components/jobs/queries/__generated__/JobDetail.generated';
import type { JobDetail } from '@/components/jobs/types';
import { CreateJobContractorDocument } from './mutations/__generated__/CreateJobContractor.generated';
import { JobContractorPickerDocument } from './queries/__generated__/JobContractorPicker.generated';

const schema = z.object({ contractorId: z.string().min(1, 'Choose a contractor') });

interface AddJobContractorModalProps {
  job: JobDetail;
  onClose: () => void;
  open: boolean;
}

/** Picks a contractor from the directory, among those not already on the job, and adds them. */
export default function AddJobContractorModal({ job, onClose, open }: AddJobContractorModalProps) {
  const contractors = useQuery(JobContractorPickerDocument).data?.contractors ?? [];
  const [createJobContractor] = useMutation(CreateJobContractorDocument, { refetchQueries: [JobDetailDocument] });
  const form = useForm({ defaultValues: { contractorId: '' }, resolver: zodResolver(schema) });
  const attachedIds = new Set(job.contractors.map((jc) => jc.contractor.id));
  const available = contractors.filter((c) => !attachedIds.has(c.id));

  useEffect(() => {
    if (open) form.reset({ contractorId: '' });
  }, [form, open]);

  async function handleSubmit({ contractorId }: z.output<typeof schema>) {
    await createJobContractor({ variables: { contractorId, jobId: job.id } });
    onClose();
  }

  return (
    <Modal onClose={onClose} open={open} title="Add Contractor to Job">
      <Form form={form} onSubmit={handleSubmit}>
        <Field label="Select Contractor" name="contractorId">
          <Select {...form.register('contractorId')}>
            <option value="">-- Select --</option>
            {available.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.companyName ? ` (${c.companyName})` : ''}
              </option>
            ))}
          </Select>
        </Field>
        <FormActions>
          <Button onClick={onClose} variant="secondary">Cancel</Button>
          <SubmitButton submittingText="Adding...">Add</SubmitButton>
        </FormActions>
      </Form>
    </Modal>
  );
}
