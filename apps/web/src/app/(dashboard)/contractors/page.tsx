'use client';
import { useState, useEffect, FormEvent } from 'react';
import { TradeCategory } from '@thms/shared';
import { listContractors } from './queries';
import { createContractor, updateContractor, deleteContractor } from './mutations';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import Table, { Column } from '@/components/ui/Table';
import Selector, { SelectorOption } from '@/components/ui/Selector';
import Dropdown from '@/components/ui/Dropdown';

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

const CATEGORY_OPTIONS: SelectorOption[] = [
  { value: '', label: 'All categories' },
  ...Object.values(TradeCategory).map((v) => ({ value: v, label: CATEGORY_LABELS[v] })),
];

type Contractor = any;

const COLUMNS: Column<Contractor>[] = [
  {
    key: 'name',
    header: 'Name',
    render: (c) => (
      <div>
        <span className="font-medium text-gray-900">{c.name}</span>
        {c.companyName && <span className="ml-2 text-gray-400 text-xs">– {c.companyName}</span>}
      </div>
    ),
  },
  {
    key: 'category',
    header: 'Category',
    render: (c) => (
      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
        {CATEGORY_LABELS[c.category as TradeCategory] ?? c.category}
      </span>
    ),
  },
  { key: 'email', header: 'Email', render: (c) => c.email || '—' },
  { key: 'phone', header: 'Phone', render: (c) => c.phone || '—' },
  {
    key: 'actions',
    header: '',
    render: (c) => (
      <Dropdown
        trigger={<button className="btn-secondary text-xs py-1 px-2">Actions ▾</button>}
        items={[
          { label: 'Edit', onClick: () => openEdit(c) },
          { label: 'Delete', danger: true, onClick: () => handleDelete(c.id, c.name) },
        ]}
      />
    ),
  },
];

// openEdit / handleDelete need to be accessible from COLUMNS — using module-level refs
let openEdit: (c: Contractor) => void = () => {};
let handleDelete: (id: string, name: string) => void = () => {};

export default function ContractorsPage() {
  const [list, setList] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Contractor | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', companyName: '', email: '', phone: '', category: '', notes: '' });

  useEffect(() => { load(); }, [search, category]);

  async function load() {
    setLoading(true);
    try {
      const res = await listContractors({ search: search || undefined, category: category || undefined });
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

  openEdit = (c: Contractor) => {
    setForm({ name: c.name, companyName: c.companyName || '', email: c.email || '', phone: c.phone || '', category: c.category, notes: c.notes || '' });
    setEditing(c);
    setError('');
    setShowCreate(true);
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) {
        const res = await updateContractor(editing.id, form);
        setList((prev) => prev.map((c) => (c.id === editing.id ? res.data : c)));
      } else {
        const res = await createContractor(form);
        setList((prev) => [res.data, ...prev]);
      }
      setShowCreate(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  handleDelete = async (contractorId: string, name: string) => {
    if (!confirm(`Delete ${name}?`)) return;
    try {
      await deleteContractor(contractorId);
      setList((prev) => prev.filter((c) => c.id !== contractorId));
    } catch {}
  };

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
        <div className="w-52">
          <Selector
            options={CATEGORY_OPTIONS}
            value={category}
            onChange={setCategory}
            placeholder="All categories"
          />
        </div>
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
        <Table columns={COLUMNS} rows={list} getKey={(c) => c.id} pageSize={15} />
      )}

      <Modal
        title={editing ? 'Edit Contractor' : 'Add Contractor'}
        open={showCreate}
        onClose={() => setShowCreate(false)}
      >
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
              <input className="input" value={form.companyName} onChange={(e) => update('companyName', e.target.value)} placeholder="Smith Decks" />
            </div>
          </div>
          <div>
            <label className="label">Category</label>
            <Selector
              options={Object.values(TradeCategory).map((v) => ({ value: v, label: CATEGORY_LABELS[v] }))}
              value={form.category}
              onChange={(v) => update('category', v)}
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
