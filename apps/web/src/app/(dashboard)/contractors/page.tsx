'use client';
import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { TradeCategory, UserRole } from '@thms/shared';
import { useRouter } from 'next/navigation';
import { listContractors } from './queries';
import { createContractor, updateContractor, deleteContractor } from './mutations';
import { createUserContractor } from '@/app/(dashboard)/my-rolodex/mutations';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import Selector, { SelectorOption } from '@/components/ui/Selector';
import { getStoredUser } from '@/lib/auth';

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

type Contractor = {
  id: string;
  name: string;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  categories: TradeCategory[];
  zipCodes: string[];
  notes?: string | null;
};

export default function ContractorsPage() {
  const isAdmin = getStoredUser()?.role === UserRole.ADMIN;
  const router = useRouter();
  const [list, setList] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTradeCategory, setSelectedTradeCategory] = useState('');
  const [zipFilter, setZipFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Contractor | null>(null);
  const [saving, setSaving] = useState(false);
  const [addingId, setAddingId] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', companyName: '', email: '', phone: '', category: '', zipCodes: '', notes: '' });

  useEffect(() => { load(); }, [search, selectedTradeCategory, zipFilter]);

  async function load() {
    setLoading(true);
    try {
      const res = await listContractors({
        search: search || undefined,
        tradeCategories: selectedTradeCategory ? [selectedTradeCategory] : undefined,
        zipCodes: zipFilter.trim() ? [zipFilter.trim()] : undefined,
      });
      setList(res.data);
    } catch {}
    setLoading(false);
  }

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function openCreate() {
    setForm({ name: '', companyName: '', email: '', phone: '', category: '', zipCodes: '', notes: '' });
    setEditing(null);
    setError('');
    setShowCreate(true);
  }

  function openEdit(c: Contractor) {
    setForm({
      name: c.name,
      companyName: c.companyName || '',
      email: c.email || '',
      phone: c.phone || '',
      category: c.categories[0] || '',
      zipCodes: c.zipCodes.join(', '),
      notes: c.notes || '',
    });
    setEditing(c);
    setError('');
    setShowCreate(true);
  }

  function payloadFromForm() {
    return {
      name: form.name,
      companyName: form.companyName || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      categories: form.category ? [form.category as TradeCategory] : [],
      zipCodes: form.zipCodes.split(',').map((zipCode) => zipCode.trim()).filter(Boolean),
      notes: form.notes || undefined,
    };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) {
        const res = await updateContractor(editing.id, payloadFromForm());
        setList((prev) => prev.map((c) => (c.id === editing.id ? res.data : c)));
      } else {
        const res = await createContractor(payloadFromForm());
        setList((prev) => [res.data, ...prev]);
      }
      setShowCreate(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddToMyVendors(contractor: Contractor) {
    setAddingId(contractor.id);
    try {
      await createUserContractor({
        contractorId: contractor.id,
        name: contractor.name,
        companyName: contractor.companyName || undefined,
        email: contractor.email || undefined,
        phone: contractor.phone || undefined,
        categories: contractor.categories,
        zipCodes: contractor.zipCodes.length ? contractor.zipCodes : undefined,
        notes: contractor.notes || undefined,
      });
    } catch {
    } finally {
      setAddingId('');
    }
  }

  async function handleDelete(contractorId: string, name: string) {
    if (!confirm(`Delete ${name}?`)) return;
    try {
      await deleteContractor(contractorId);
      setList((prev) => prev.filter((c) => c.id !== contractorId));
    } catch {}
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/my-rolodex" className="btn-secondary">My Rolodex</Link>
          {isAdmin && <button onClick={openCreate} className="btn-primary">+ Add Vendor</button>}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
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
            value={selectedTradeCategory}
            onChange={setSelectedTradeCategory}
            placeholder="All categories"
          />
        </div>
        <input
          type="text"
          className="input max-w-32"
          placeholder="ZIP"
          value={zipFilter}
          onChange={(e) => setZipFilter(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : list.length === 0 ? (
        <EmptyState
          title="No vendors found"
          description="Clear filters or add a vendor to the global list."
          action={isAdmin ? <button onClick={openCreate} className="btn-primary">Add Vendor</button> : undefined}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 bg-white text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categories</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ZIP codes</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.map((contractor) => (
                <tr
                  key={contractor.id}
                  onClick={() => router.push(`/contractors/${contractor.id}`)}
                  className="group hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-4 py-3 text-gray-700">
                    <div>
                      <span className="font-medium text-gray-900">{contractor.name}</span>
                      {contractor.companyName && <span className="ml-2 text-gray-400 text-xs">- {contractor.companyName}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <div className="flex flex-wrap gap-1">
                      {contractor.categories.map((value) => (
                        <span key={value} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
                          {CATEGORY_LABELS[value] ?? value}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{contractor.zipCodes.length ? contractor.zipCodes.join(', ') : '-'}</td>
                  <td className="px-4 py-3 text-gray-700">
                    <div>{contractor.email || '-'}</div>
                    {contractor.phone && <div className="text-xs text-gray-400">{contractor.phone}</div>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <button
                        type="button"
                        className="btn-secondary text-xs py-1 px-2"
                        onClick={(e) => { e.stopPropagation(); handleAddToMyVendors(contractor); }}
                        disabled={addingId === contractor.id}
                        aria-label="Add to my vendors"
                      >
                        {addingId === contractor.id ? 'Adding...' : '☆ Add to my vendors'}
                      </button>
                      {isAdmin && (
                        <>
                          <button type="button" className="btn-secondary text-xs py-1 px-2" onClick={(e) => { e.stopPropagation(); openEdit(contractor); }}>Edit</button>
                          <button type="button" className="btn-danger text-xs py-1 px-2" onClick={(e) => { e.stopPropagation(); handleDelete(contractor.id, contractor.name); }}>Delete</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        title={editing ? 'Edit Vendor' : 'Add Vendor'}
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
          <div>
            <label className="label">ZIP codes</label>
            <input className="input" value={form.zipCodes} onChange={(e) => update('zipCodes', e.target.value)} placeholder="78701, 78702" />
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
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : (editing ? 'Save Changes' : 'Add Vendor')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
