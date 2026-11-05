'use client';
import { useState, FormEvent } from 'react';
import { useMutation } from '@apollo/client/react';
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
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Card from '@/components/ui/Card';

interface Props {
  job: JobDetail;
}

export default function QuotesTab({ job }: Props) {
  const quotesList = job.quotes;
  const refetchQueries = [JobDetailDocument];
  const [createQuote] = useMutation(CreateQuoteDocument, { refetchQueries });
  const [updateQuote] = useMutation(UpdateQuoteDocument);
  const [deleteQuote] = useMutation(DeleteQuoteDocument, { refetchQueries });
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    contractorId: '',
    amount: '',
    description: '',
    status: 'DRAFT',
  });

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createQuote({ variables: {
        jobId:        job.id,
        contractorId: form.contractorId,
        amount:       parseFloat(form.amount),
        description:  form.description,
        status:       form.status as QuoteStatus,
      } });
      setShowAdd(false);
      setForm({ contractorId: '', amount: '', description: '', status: 'DRAFT' });
    } catch {}
    setSaving(false);
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
        <Button variant="primary" onClick={() => setShowAdd(true)} className="text-sm">
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
        <form onSubmit={handleAdd} className="space-y-4">
          <Field label="Contractor">
            <Select
              value={form.contractorId}
              onChange={(e) => update('contractorId', e.target.value)}
              required
            >
              <option value="">-- Select contractor --</option>
              {contractors.map((jc) => (
                <option key={jc.contractor.id} value={jc.contractor.id}>
                  {jc.contractor?.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Amount ($)">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => update('amount', e.target.value)}
              placeholder="12000"
              required
            />
          </Field>
          <Field label="Description">
            <Input
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Cedar deck estimate"
            />
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => update('status', e.target.value)}>
              <option value="DRAFT">Draft</option>
              <option value="CONFIRMED">Confirmed</option>
            </Select>
          </Field>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Add Quote'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
