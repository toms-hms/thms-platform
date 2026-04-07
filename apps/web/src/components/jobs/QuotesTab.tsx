'use client';
import { useState, FormEvent } from 'react';
import { quotes as quotesApi } from '@/lib/api';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';

interface Props {
  job: any;
}

export default function QuotesTab({ job }: Props) {
  const [quotesList, setQuotesList] = useState<any[]>(job.quotes || []);
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
      const res = await quotesApi.create(job.id, {
        contractorId: form.contractorId,
        amount: parseFloat(form.amount),
        description: form.description,
        status: form.status,
      });
      setQuotesList((prev) => [res.data, ...prev]);
      setShowAdd(false);
      setForm({ contractorId: '', amount: '', description: '', status: 'DRAFT' });
    } catch {}
    setSaving(false);
  }

  async function handleConfirm(quote: any) {
    try {
      const res = await quotesApi.update(quote.id, { status: 'CONFIRMED' });
      setQuotesList((prev) => prev.map((q) => (q.id === quote.id ? res.data : q)));
    } catch {}
  }

  async function handleDelete(quoteId: string) {
    if (!confirm('Delete this quote?')) return;
    try {
      await quotesApi.delete(quoteId);
      setQuotesList((prev) => prev.filter((q) => q.id !== quoteId));
    } catch {}
  }

  const confirmed = quotesList.filter((q) => q.status === 'CONFIRMED');
  const drafts = quotesList.filter((q) => q.status === 'DRAFT');
  const contractors = job.contractors || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-800">Quotes</h3>
        <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">
          + Add Quote
        </button>
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
                  <div key={q.id} className="card p-4 flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">
                        ${q.amount.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600">{q.contractor?.name}</p>
                      {q.description && (
                        <p className="text-xs text-gray-400 mt-1">{q.description}</p>
                      )}
                    </div>
                    <button onClick={() => handleDelete(q.id)} className="text-gray-300 hover:text-red-500 text-sm">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {drafts.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Draft Quotes</h4>
              <div className="space-y-2">
                {drafts.map((q) => (
                  <div key={q.id} className="card p-4 border-dashed border-gray-300">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">${q.amount.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">{q.contractor?.name}</p>
                        {q.description && (
                          <p className="text-xs text-gray-400 mt-1">{q.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleConfirm(q)} className="btn-primary text-xs py-1 px-2">
                          Confirm
                        </button>
                        <button onClick={() => handleDelete(q.id)} className="text-gray-300 hover:text-red-500 text-sm">
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal title="Add Quote" open={showAdd} onClose={() => setShowAdd(false)}>
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="label">Contractor</label>
            <select
              className="input"
              value={form.contractorId}
              onChange={(e) => update('contractorId', e.target.value)}
              required
            >
              <option value="">-- Select contractor --</option>
              {contractors.map((jc: any) => (
                <option key={jc.contractorId} value={jc.contractorId}>
                  {jc.contractor?.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Amount ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input"
              value={form.amount}
              onChange={(e) => update('amount', e.target.value)}
              placeholder="12000"
              required
            />
          </div>
          <div>
            <label className="label">Description</label>
            <input
              className="input"
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Cedar deck estimate"
            />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => update('status', e.target.value)}>
              <option value="DRAFT">Draft</option>
              <option value="CONFIRMED">Confirmed</option>
            </select>
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Add Quote'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
