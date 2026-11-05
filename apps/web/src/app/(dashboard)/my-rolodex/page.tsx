'use client';
import { FormEvent, useState } from 'react';
import Link from '@/components/ui/Link';
import { useMutation, useQuery } from '@apollo/client/react';
import { TradeCategory } from '@/graphql/types.generated';
import { UserContractorsDocument } from './queries/__generated__/UserContractors.generated';
import { CreateUserContractorDocument } from './mutations/__generated__/CreateUserContractor.generated';
import { DeleteUserContractorDocument } from './mutations/__generated__/DeleteUserContractor.generated';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import Selector from '@/components/ui/Selector';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
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

export default function MyRolodexPage() {
  const { data, loading: fetching, refetch } = useQuery(UserContractorsDocument);
  const entries = data?.userContractors ?? [];
  const loading = fetching && !data;
  const [createUserContractor] = useMutation(CreateUserContractorDocument);
  const [deleteUserContractor] = useMutation(DeleteUserContractorDocument);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', companyName: '', email: '', phone: '',
    category: '', zipCode: '', notes: '', note: '',
  });

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
      await createUserContractor({ variables: {
        name:        form.name || undefined,
        companyName: form.companyName || undefined,
        email:       form.email || undefined,
        phone:       form.phone || undefined,
        categories:  form.category ? [form.category as TradeCategory] : undefined,
        zipCodes:    form.zipCode ? [form.zipCode] : undefined,
        notes:       form.notes || undefined,
        note:        form.note || undefined,
      } });
      await refetch();
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
      await deleteUserContractor({ variables: { userContractorId: id } });
      await refetch();
    } catch {}
  }

  return (
    <div>
      <PageHeader
        actions={
          <>
            <Link href="/contractors" variant="secondary">Global Contractors</Link>
            <Button onClick={openCreate} variant="primary">+ Add Contractor</Button>
          </>
        }
        subtitle="Your personal contractor list — global and private."
        title="My Rolodex"
      />

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : entries.length === 0 ? (
        <EmptyState
          title="No contractors saved"
          description="Add a contractor manually or save one from the global list."
          action={<Button variant="primary" onClick={openCreate}>Add Contractor</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {entries.map((entry) => {
            const c = entry.contractor;
            return (
              <Card key={entry.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-gray-900">{c.name}</h2>
                      {c.isGlobal && <Badge>Global</Badge>}
                    </div>
                    {c.companyName && <p className="text-sm text-gray-500 mt-1">{c.companyName}</p>}
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => handleDelete(entry.id, c.name)}>
                    Remove
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {c.categories.map((value) => (
                    <span key={value} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
                      {CATEGORY_LABELS[value as TradeCategory] ?? value}
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
              </Card>
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
            <Field label="Name">
              <Input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="John Smith" required />
            </Field>
            <Field label="Company">
              <Input value={form.companyName} onChange={(e) => update('companyName', e.target.value)} placeholder="Smith Plumbing" />
            </Field>
          </div>
          <Field label="Category">
            <Selector
              options={Object.values(TradeCategory).map((value) => ({ value, label: CATEGORY_LABELS[value] }))}
              value={form.category}
              onChange={(value) => update('category', value)}
              placeholder="Select a category"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="john@company.com" />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="5125551212" />
            </Field>
          </div>
          <Field label="ZIP Code">
            <Input value={form.zipCode} onChange={(e) => update('zipCode', e.target.value)} placeholder="78701" />
          </Field>
          <Field label="Contractor notes">
            <Textarea rows={2} value={form.notes} onChange={(e) => update('notes', e.target.value)} placeholder="Background info on this contractor..." />
          </Field>
          <Field label="Your personal note">
            <Textarea rows={2} value={form.note} onChange={(e) => update('note', e.target.value)} placeholder="Met at the trade show, great for HVAC..." />
          </Field>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Add Contractor'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
