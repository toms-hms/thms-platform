'use client';
import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { TradeCategory, type UserContractorDto } from '@thms/shared';
import { createUserContractor, deleteUserContractor } from './mutations';
import { listUserContractors } from './queries';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import Selector from '@/components/ui/Selector';

const CATEGORY_LABELS: Record<TradeCategory, string> = {
  [TradeCategory.PLUMBING]:            'Plumbing',
  [TradeCategory.ELECTRICAL]:          'Electrical',
  [TradeCategory.HVAC]:                'HVAC',
  [TradeCategory.ROOFING]:             'Roofing',
  [TradeCategory.PAINTING]:            'Painting',
  [TradeCategory.LANDSCAPING]:         'Landscaping',
  [TradeCategory.GENERAL_CONTRACTING]: 'General Contracting',
  [TradeCategory.CARPENTRY]:           'Carpentry',
  [TradeCategory.FLOORING]:            'Flooring',
  [TradeCategory.PEST_CONTROL]:        'Pest Control',
  [TradeCategory.DOORS_AND_WINDOWS]:   'Doors & Windows',
  [TradeCategory.POOL_AND_SPA]:        'Pool & Spa',
};

export default function MyRolodexPage() {
  const [entries, setEntries] = useState<UserContractorDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', companyName: '', email: '', phone: '',
    category: '', zipCode: '', notes: '', note: '',
  });

  useEffect(() => { loadEntries(); }, []);

  async function loadEntries() {
    setLoading(true);
    try {
      const res = await listUserContractors();
      setEntries(res.data);
    } catch {}
    setLoading(false);
  }

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function openCreate() {
    setForm({ name: '', companyName: '', email: '', phone: '', category: '', zipCode: '', notes: '', note: '' });
    setError('');
    setShowCreate(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await createUserContractor({
        name:        form.name || undefined,
        companyName: form.companyName || undefined,
        email:       form.email || undefined,
        phone:       form.phone || undefined,
        categories:  form.category ? [form.category as TradeCategory] : undefined,
        zipCodes:    form.zipCode ? [form.zipCode] : undefined,
        notes:       form.notes || undefined,
        note:        form.note || undefined,
      });
      setEntries((prev) => [res.data, ...prev]);
      setShowCreate(false);
    } catch (err: any) {
      setError(err.message || 'Failed to add contractor');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove ${name} from your rolodex?`)) return;
    try {
      await deleteUserContractor(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch {}
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Rolodex</h1>
          <p className="text-sm text-gray-500 mt-1">Your personal contractor list — global and private.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/contractors" className="btn-secondary">Global Contractors</Link>
          <button onClick={openCreate} className="btn-primary">+ Add Contractor</button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : entries.length === 0 ? (
        <EmptyState
          title="No contractors saved"
          description="Add a contractor manually or save one from the global list."
          action={<button onClick={openCreate} className="btn-primary">Add Contractor</button>}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {entries.map((entry) => {
            const c = entry.contractor;
            return (
              <div key={entry.id} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-gray-900">{c.name}</h2>
                      {c.isGlobal && <span className="badge">Global</span>}
                    </div>
                    {c.companyName && <p className="text-sm text-gray-500 mt-1">{c.companyName}</p>}
                  </div>
                  <button className="btn-secondary text-xs py-1 px-2" onClick={() => handleDelete(entry.id, c.name)}>
                    Remove
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {c.categories.map((value) => (
                    <span key={value} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
                      {CATEGORY_LABELS[value] ?? value}
                    </span>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <div>{c.email || '—'}</div>
                  <div>{c.phone || '—'}</div>
                  {c.zipCodes.length > 0 && (
                    <div className="col-span-2">ZIP: {c.zipCodes.join(', ')}</div>
                  )}
                </div>
                {entry.note && (
                  <p className="mt-3 text-sm text-gray-500 italic">&ldquo;{entry.note}&rdquo;</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal title="Add Contractor" open={showCreate} onClose={() => setShowCreate(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Name</label>
              <input className="input" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="John Smith" required />
            </div>
            <div>
              <label className="label">Company</label>
              <input className="input" value={form.companyName} onChange={(e) => update('companyName', e.target.value)} placeholder="Smith Plumbing" />
            </div>
          </div>
          <div>
            <label className="label">Category</label>
            <Selector
              options={Object.values(TradeCategory).map((value) => ({ value, label: CATEGORY_LABELS[value] }))}
              value={form.category}
              onChange={(value) => update('category', value)}
              placeholder="Select a category"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="john@company.com" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="5125551212" />
            </div>
          </div>
          <div>
            <label className="label">ZIP Code</label>
            <input className="input" value={form.zipCode} onChange={(e) => update('zipCode', e.target.value)} placeholder="78701" />
          </div>
          <div>
            <label className="label">Contractor notes</label>
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => update('notes', e.target.value)} placeholder="Background info on this contractor..." />
          </div>
          <div>
            <label className="label">Your personal note</label>
            <textarea className="input" rows={2} value={form.note} onChange={(e) => update('note', e.target.value)} placeholder="Met at the trade show, great for HVAC..." />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Add Contractor'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
