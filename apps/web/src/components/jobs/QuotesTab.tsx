'use client';
import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { QuoteStatus } from '@/graphql/types.generated';
import { CreateQuoteDocument } from './mutations/__generated__/CreateQuote.generated';
import { UpdateQuoteDocument } from './mutations/__generated__/UpdateQuote.generated';
import { DeleteQuoteDocument } from './mutations/__generated__/DeleteQuote.generated';
import { JobDetailDocument } from './queries/__generated__/JobDetail.generated';
import type { JobDetail } from './types';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import Form from '@/components/ui/Form';
import FormActions from '@/components/ui/FormActions';
import SubmitButton from '@/components/ui/SubmitButton';
import { optionalText } from '@/lib/formFields';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Card from '@/components/ui/Card';

const schema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, 'Enter the amount')
    .transform(Number)
    .pipe(z.number().positive('The amount must be more than 0')),
  contractorId: z.string().min(1, 'Choose a contractor'),
  description: optionalText,
  status: z.enum(QuoteStatus),
});

const EMPTY_QUOTE = { amount: '', contractorId: '', description: '', status: QuoteStatus.DRAFT };

interface QuotesTabProps {
  job: JobDetail;
}

export default function QuotesTab({ job }: QuotesTabProps) {
  const quotesList = job.quotes;
  const refetchQueries = [JobDetailDocument];
  const [createQuote] = useMutation(CreateQuoteDocument, { refetchQueries });
  const [updateQuote] = useMutation(UpdateQuoteDocument);
  const [deleteQuote] = useMutation(DeleteQuoteDocument, { refetchQueries });
  const [showAdd, setShowAdd] = useState(false);
  const form = useForm({ defaultValues: EMPTY_QUOTE, resolver: zodResolver(schema) });

  function openAdd() {
    form.reset(EMPTY_QUOTE);
    setShowAdd(true);
  }

  async function handleAdd(values: z.output<typeof schema>) {
    await createQuote({ variables: { jobId: job.id, ...values } });
    setShowAdd(false);
  }

  async function handleConfirm(quote: JobDetail['quotes'][number]) {
    try {
      await updateQuote({ variables: { quoteId: quote.id, status: QuoteStatus.CONFIRMED } });
    } catch {}
  }

  async function handleDelete(quoteId: string) {
    if (!confirm('Delete this quote?')) return;
    try {
      await deleteQuote({ variables: { quoteId } });
    } catch {}
  }

  const confirmed = quotesList.filter((q) => q.status === 'CONFIRMED');
  const drafts = quotesList.filter((q) => q.status === 'DRAFT');
  const contractors = job.contractors;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-800">Quotes</h3>
        <Button variant="primary" onClick={openAdd} className="text-sm">
          + Add Quote
        </Button>
      </div>

      {quotesList.length === 0 ? (
        <EmptyState
          title="No quotes yet"
          description="Quotes will be extracted from emails or you can add them manually."
        />
      ) : (
        <div className="space-y-4">
          {confirmed.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Confirmed Quotes</h4>
              <div className="space-y-2">
                {confirmed.map((q) => (
                  <Card key={q.id} className="p-4 flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">
                        ${q.amount.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600">{q.contractor?.name}</p>
                      {q.description && (
                        <p className="text-xs text-gray-400 mt-1">{q.description}</p>
                      )}
                    </div>
                    <Button variant="bare" onClick={() => handleDelete(q.id)} className="text-gray-300 hover:text-red-500 text-sm">
                      ✕
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {drafts.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Draft Quotes</h4>
              <div className="space-y-2">
                {drafts.map((q) => (
                  <Card key={q.id} className="p-4 border-dashed border-gray-300">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">${q.amount.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">{q.contractor?.name}</p>
                        {q.description && (
                          <p className="text-xs text-gray-400 mt-1">{q.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="primary" size="sm" onClick={() => handleConfirm(q)}>
                          Confirm
                        </Button>
                        <Button variant="bare" onClick={() => handleDelete(q.id)} className="text-gray-300 hover:text-red-500 text-sm">
                          ✕
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal title="Add Quote" open={showAdd} onClose={() => setShowAdd(false)}>
        <Form form={form} onSubmit={handleAdd}>
          <Field label="Contractor" name="contractorId">
            <Select {...form.register('contractorId')}>
              <option value="">-- Select contractor --</option>
              {contractors.map((jc) => (
                <option key={jc.contractor.id} value={jc.contractor.id}>
                  {jc.contractor.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Amount ($)" name="amount">
            <Input min="0" placeholder="12000" step="0.01" type="number" {...form.register('amount')} />
          </Field>
          <Field label="Description" name="description">
            <Input placeholder="Cedar deck estimate" {...form.register('description')} />
          </Field>
          <Field label="Status" name="status">
            <Select {...form.register('status')}>
              <option value={QuoteStatus.DRAFT}>Draft</option>
              <option value={QuoteStatus.CONFIRMED}>Confirmed</option>
            </Select>
          </Field>
          <FormActions>
            <Button onClick={() => setShowAdd(false)} variant="secondary">Cancel</Button>
            <SubmitButton submittingText="Saving...">Add Quote</SubmitButton>
          </FormActions>
        </Form>
      </Modal>
    </div>
  );
}
