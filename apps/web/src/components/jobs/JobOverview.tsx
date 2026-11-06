'use client';
import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import Form from '@/components/ui/Form';
import FormActions from '@/components/ui/FormActions';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import StatusBadge from '@/components/ui/StatusBadge';
import SubmitButton from '@/components/ui/SubmitButton';
import Textarea from '@/components/ui/Textarea';
import { JobStatus, TradeCategory } from '@/graphql/types.generated';
import { clearableText, requiredText } from '@/lib/formFields';
import { JOB_STATUSES, jobStatusLabel } from '@/lib/jobStatuses';
import { TRADE_CATEGORY_OPTIONS } from '@/lib/tradeCategories';
import { UpdateJobDocument } from './mutations/__generated__/UpdateJob.generated';
import type { JobDetail } from './types';

const schema = z.object({
  category: z.enum(TradeCategory, 'Choose a category'),
  description: clearableText,
  notes: clearableText,
  status: z.enum(JobStatus),
  title: requiredText('Give the job a title'),
});

function formFrom(job: JobDetail): z.input<typeof schema> {
  return {
    category: job.category as TradeCategory,
    description: job.description || '',
    notes: job.notes || '',
    status: job.status as JobStatus,
    title: job.title,
  };
}

interface JobOverviewProps {
  job: JobDetail;
}

/** The job's summary, with an inline form to edit its title, category, status, description and notes. */
export default function JobOverview({ job }: JobOverviewProps) {
  const [updateJob] = useMutation(UpdateJobDocument);
  const [editing, setEditing] = useState(false);
  const form = useForm({ defaultValues: formFrom(job), resolver: zodResolver(schema) });

  function startEditing() {
    form.reset(formFrom(job));
    setEditing(true);
  }

  async function handleSave(values: z.output<typeof schema>) {
    await updateJob({ variables: { jobId: job.id, ...values } });
    setEditing(false);
  }

  if (editing) {
    return (
      <Form form={form} onSubmit={handleSave}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Title" name="title">
            <Input {...form.register('title')} />
          </Field>
          <Field label="Category" name="category">
            <Select {...form.register('category')}>
              {TRADE_CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Status" name="status">
          <Select {...form.register('status')}>
            {JOB_STATUSES.map((status) => (
              <option key={status} value={status}>{jobStatusLabel(status)}</option>
            ))}
          </Select>
        </Field>
        <Field label="Description" name="description">
          <Textarea rows={4} {...form.register('description')} />
        </Field>
        <Field label="Notes" name="notes">
          <Textarea rows={3} {...form.register('notes')} />
        </Field>
        <FormActions className="justify-start">
          <SubmitButton submittingText="Saving...">Save</SubmitButton>
          <Button onClick={() => setEditing(false)} variant="secondary">Cancel</Button>
        </FormActions>
      </Form>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">{job.title}</h2>
            <StatusBadge status={job.status} />
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Category: {job.category}</p>
        </div>
        <Button variant="secondary" onClick={startEditing} className="text-xs">Edit</Button>
      </div>

      {job.description && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-1">Description</h4>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{job.description}</p>
        </div>
      )}

      {job.notes && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-1">Notes</h4>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{job.notes}</p>
        </div>
      )}

      <div className="pt-2 border-t border-gray-100">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Contractor Summary</h4>
        {job.contractors.length === 0 ? (
          <p className="text-sm text-gray-400">No contractors attached yet.</p>
        ) : (
          <div className="space-y-2">
            {job.contractors.map((jc) => (
              <div key={jc.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{jc.contractor.name}</span>
                <StatusBadge status={jc.status} type="contractor" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
