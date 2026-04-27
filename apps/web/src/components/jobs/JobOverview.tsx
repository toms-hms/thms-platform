'use client';
import { useState, FormEvent } from 'react';
import StatusBadge from '@/components/ui/StatusBadge';
import { updateJob } from './mutations';

const JOB_STATUSES = [
  'DRAFT', 'PLANNING', 'REACHING_OUT', 'COMPARING_QUOTES',
  'SCHEDULED', 'IN_PROGRESS', 'AWAITING_PAYMENT', 'COMPLETED',
];

interface Props {
  job: any;
  onUpdated: (job: any) => void;
}

export default function JobOverview({ job, onUpdated }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: job.title,
    category: job.category,
    description: job.description || '',
    notes: job.notes || '',
    status: job.status,
  });

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateJob(job.id, form);
      onUpdated(res.data);
      setEditing(false);
    } catch {}
    setSaving(false);
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Title</label>
            <input className="input" value={form.title} onChange={(e) => update('title', e.target.value)} required />
          </div>
          <div>
            <label className="label">Category</label>
            <input className="input" value={form.category} onChange={(e) => update('category', e.target.value)} required />
          </div>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={form.status} onChange={(e) => update('status', e.target.value)}>
            {JOB_STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input" rows={4} value={form.description} onChange={(e) => update('description', e.target.value)} />
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={3} value={form.notes} onChange={(e) => update('notes', e.target.value)} />
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
          <button type="button" onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
        </div>
      </form>
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
        <button onClick={() => setEditing(true)} className="btn-secondary text-xs">Edit</button>
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
        {job.contractors?.length === 0 ? (
          <p className="text-sm text-gray-400">No contractors attached yet.</p>
        ) : (
          <div className="space-y-2">
            {job.contractors?.map((jc: any) => (
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
