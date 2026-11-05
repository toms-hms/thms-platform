'use client';
import { useState, FormEvent } from 'react';
import Link from '@/components/ui/Link';
import { useMutation, useQuery } from '@apollo/client/react';
import { TradeCategory } from '@/graphql/types.generated';
import { UserRole } from '@/types/api';
import { useRouter } from 'next/navigation';
import { ContractorsDocument, type ContractorsQuery } from './queries/__generated__/Contractors.generated';
import { CreateContractorDocument } from './mutations/__generated__/CreateContractor.generated';
import { UpdateContractorDocument } from './mutations/__generated__/UpdateContractor.generated';
import { DeleteContractorDocument } from './mutations/__generated__/DeleteContractor.generated';
import { AddContractorToRolodexDocument } from './mutations/__generated__/AddContractorToRolodex.generated';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import Selector, { SelectorOption } from '@/components/ui/Selector';
import { getStoredUser } from '@/lib/auth';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import PageHeader from '@/components/ui/PageHeader';

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

type Contractor = ContractorsQuery['contractors'][number];

export default function ContractorsPage() {
  const isAdmin = getStoredUser()?.role === UserRole.ADMIN;
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedTradeCategory, setSelectedTradeCategory] = useState('');
  const [zipFilter, setZipFilter] = useState('');
  const { data, loading: fetching, refetch } = useQuery(ContractorsDocument, {
    variables: {
      search: search || undefined,
      tradeCategories: selectedTradeCategory ? [selectedTradeCategory as TradeCategory] : undefined,
      zipCodes: zipFilter.trim() ? [zipFilter.trim()] : undefined,
    },
  });
  const list = data?.contractors ?? [];
  const loading = fetching && !data;
  const [createContractor] = useMutation(CreateContractorDocument);
  const [updateContractor] = useMutation(UpdateContractorDocument);
  const [deleteContractor] = useMutation(DeleteContractorDocument);
  const [createUserContractor] = useMutation(AddContractorToRolodexDocument);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Contractor | null>(null);
  const [saving, setSaving] = useState(false);
  const [addingId, setAddingId] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', companyName: '', email: '', phone: '', category: '', zipCodes: '', notes: '' });

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
        await updateContractor({ variables: { contractorId: editing.id, ...payloadFromForm() } });
      } else {
        await createContractor({ variables: payloadFromForm() });
        await refetch();
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
      await createUserContractor({ variables: {
        contractorId: contractor.id,
        name: contractor.name,
        companyName: contractor.companyName || undefined,
        email: contractor.email || undefined,
        phone: contractor.phone || undefined,
        categories: contractor.categories as TradeCategory[],
        zipCodes: contractor.zipCodes.length ? contractor.zipCodes : undefined,
        notes: contractor.notes || undefined,
      } });
    } catch {
    } finally {
      setAddingId('');
    }
  }

  async function handleDelete(contractorId: string, name: string) {
    if (!confirm(`Delete ${name}?`)) return;
    try {
      await deleteContractor({ variables: { contractorId } });
      await refetch();
    } catch {}
  }

  return (
    <div>
      <PageHeader
        actions={
          <>
            <Link href="/my-rolodex" variant="secondary">My Rolodex</Link>
            {isAdmin && <Button onClick={openCreate} variant="primary">+ Add Vendor</Button>}
          </>
        }
        title="Vendors"
      />

      <div className="flex flex-wrap gap-3 mb-5">
        <Input
          type="text"
          className="max-w-xs"
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
        <Input
          type="text"
          className="max-w-32"
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
          action={isAdmin ? <Button variant="primary" onClick={openCreate}>Add Vendor</Button> : undefined}
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
                          {CATEGORY_LABELS[value as TradeCategory] ?? value}
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
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleAddToMyVendors(contractor); }}
                        disabled={addingId === contractor.id}
                        aria-label="Add to my vendors"
                      >
                        {addingId === contractor.id ? 'Adding...' : '☆ Add to my vendors'}
                      </Button>
                      {isAdmin && (
                        <>
                          <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(contractor); }}>Edit</Button>
                          <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(contractor.id, contractor.name); }}>Delete</Button>
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
            <Field label="Name">
              <Input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="John Smith" required />
            </Field>
            <Field label="Company">
              <Input value={form.companyName} onChange={(e) => update('companyName', e.target.value)} placeholder="Smith Decks" />
            </Field>
          </div>
          <Field label="Category">
            <Selector
              options={Object.values(TradeCategory).map((v) => ({ value: v, label: CATEGORY_LABELS[v] }))}
              value={form.category}
              onChange={(v) => update('category', v)}
              placeholder="Select a category"
            />
          </Field>
          <Field label="ZIP codes">
            <Input value={form.zipCodes} onChange={(e) => update('zipCodes', e.target.value)} placeholder="78701, 78702" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="john@company.com" />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="5125551212" />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea rows={3} value={form.notes} onChange={(e) => update('notes', e.target.value)} placeholder="Recommended by neighbor..." />
          </Field>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={saving}>{saving ? 'Saving...' : (editing ? 'Save Changes' : 'Add Vendor')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
