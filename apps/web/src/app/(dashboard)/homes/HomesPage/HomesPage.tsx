'use client';
import { useState, FormEvent } from 'react';
import Link from '@/components/ui/Link';
import { useMutation, useQuery } from '@apollo/client/react';
import { HomesDocument } from './queries/__generated__/Homes.generated';
import { CreateHomeDocument } from './mutations/__generated__/CreateHome.generated';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import PageHeader from '@/components/ui/PageHeader';

export default function HomesPage() {
  const { data, loading: fetching, refetch } = useQuery(HomesDocument);
  const homesList = data?.homes ?? [];
  const loading = fetching && !data;
  const [createHome] = useMutation(CreateHomeDocument);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zipCode: '',
    notes: '',
  });

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createHome({ variables: form });
      await refetch();
      setShowCreate(false);
      setForm({ name: '', address1: '', address2: '', city: '', state: '', zipCode: '', notes: '' });
    } catch (err: any) {
      setError(err.message || 'Failed to create home');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        actions={
          <Button onClick={() => setShowCreate(true)} variant="primary">
            + Add Home
          </Button>
        }
        title="My Homes"
      />

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : homesList.length === 0 ? (
        <EmptyState
          title="No homes yet"
          description="Add your first home to start managing projects."
          action={
            <Button variant="primary" onClick={() => setShowCreate(true)}>
              Add Home
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {homesList.map((home) => (
            <Link
              variant="card"
              key={home.id}
              href={`/homes/${home.id}`}
              className="p-5"
            >
              <h2 className="font-semibold text-gray-900">{home.name}</h2>
              <p className="text-sm text-gray-500 mt-1">{home.fullAddress}</p>
              {home.notes && (
                <p className="text-xs text-gray-400 mt-2 line-clamp-2">{home.notes}</p>
              )}
            </Link>
          ))}
        </div>
      )}

      <Modal title="Add Home" open={showCreate} onClose={() => setShowCreate(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </div>
          )}
          <Field label="Home Name">
            <Input
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Primary Residence"
              required
            />
          </Field>
          <Field label="Address Line 1">
            <Input
              value={form.address1}
              onChange={(e) => update('address1', e.target.value)}
              placeholder="123 Main St"
              required
            />
          </Field>
          <Field label="Address Line 2">
            <Input
              value={form.address2}
              onChange={(e) => update('address2', e.target.value)}
              placeholder="Apt 2 (optional)"
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field className="col-span-1" label="City">
              <Input
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
                placeholder="Austin"
                required
              />
            </Field>
            <Field label="State">
              <Input
                value={form.state}
                onChange={(e) => update('state', e.target.value.toUpperCase())}
                placeholder="TX"
                maxLength={2}
                required
              />
            </Field>
            <Field label="ZIP">
              <Input
                value={form.zipCode}
                onChange={(e) => update('zipCode', e.target.value)}
                placeholder="78745"
                required
              />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              placeholder="Any notes about this property..."
            />
          </Field>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Create Home'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
