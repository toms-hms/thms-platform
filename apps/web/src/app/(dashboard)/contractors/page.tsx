'use client';
import { useState, useEffect, FormEvent } from 'react';
import { contractors } from '@/lib/api';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';

export default function ContractorsPage() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    category: '',
    notes: '',
  });

  useEffect(() => {
    load();
  }, [search, category]);

  async function load() {
    setLoading(true);
    try {
      const res = await contractors.list({ search: search || undefined, category: category || undefined });
      setList(res.data);
    } catch {}
    setLoading(false);
  }

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function openCreate() {
    setForm({ name: '', companyName: '', email: '', phone: '', category: '', notes: '' });
    setEditing(null);
    setError('');
    setShowCreate(true);
  }

  function openEdit(c: any) {
    setForm({
      name: c.name,
      companyName: c.companyName || '',
      email: c.email || '',
      phone: c.phone || '',
      category: c.category,
      notes: c.notes || '',
    });
    setEditing(c);
    setError('');
    setShowCreate(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) {
        const res = await contractors.update(editing.id, form);
        setList((prev) => prev.map((c) => (c.id === editing.id ? res.data : c)));
      } else {
        const res = await contractors.create(form);
        setList((prev) => [res.data, ...prev]);
      }
      setShowCreate(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(contractorId: string, name: string) {
    if (!confirm(`Delete ${name}?`)) return;
    try {
      await contractors.delete(contractorId);
      setList((prev) => prev.filter((c) => c.id !== contractorId));
    } catch {}
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Contractors</h1>
        <button onClick={openCreate} className="btn-primary">+ Add Contractor</button>
      </div>

      <div className="flex gap-3 mb-5">
        <input
          type="text"
          className="input max-w-xs"
          placeholder="Search by name, company, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <input
          type="text"
          className="input max-w-xs"
          placeholder="Filter by category..."
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : list.length === 0 ? (
        <EmptyState
          title="No contractors found"
          description="Add contractors to manage outreach and quotes."
          action={<button onClick={openCreate} className="btn-primary">Add Contractor</button>}
        />
      ) : (
        <div className="space-y-3">
          {list.map((c) => (
            <div key={c.id} className="card p-4 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{c.name}</h3>
                  {c.companyName && <span className="text-sm text-gray-500">– {c.companyName}</span>}
                </div>
                <div className="flex gap-4 mt-1 text-xs text-gray-400">
                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{c.category}</span>
                  {c.email && <span>{c.email}</span>}
                  {c.phone && <span>{c.phone}</span>}
                </div>
                {c.notes && <p className="text-xs text-gray-400 mt-1.5">{c.notes}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => openEdit(c)} className="btn-secondary text-xs py-1 px-2">Edit</button>
                <button
                  onClick={() => handleDelete(c.id, c.name)}
                  className="text-gray-300 hover:text-red-500 text-sm"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        title={editing ? 'Edit Contractor' : 'Add Contractor'}
        open={showCreate}
        onClose={() => setShowCreate(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Name</label>
              <input className="input" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="John Smith" required />
            </div>
            <div>
              <label className="label">Company</label>
              <input className="input" value={form.companyName} onChange={(e) => update('companyName', e.target.value)} placeholder="Smith Decks" />
            </div>
          </div>
          <div>
            <label className="label">Category</label>
            <input className="input" value={form.category} onChange={(e) => update('category', e.target.value)} placeholder="deck, landscaping, plumbing..." required />
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
            <label className="label">Notes</label>
            <textarea className="input" rows={3} value={form.notes} onChange={(e) => update('notes', e.target.value)} placeholder="Recommended by neighbor..." />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : (editing ? 'Save Changes' : 'Add Contractor')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
