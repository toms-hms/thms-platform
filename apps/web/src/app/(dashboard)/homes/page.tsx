'use client';
import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { listHomes } from './queries';
import { createHome } from './mutations';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';

export default function HomesPage() {
  const [homesList, setHomesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    loadHomes();
  }, []);

  async function loadHomes() {
    try {
      const res = await listHomes();
      setHomesList(res.data);
    } catch {}
    setLoading(false);
  }

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await createHome(form);
      setHomesList((prev) => [res.data, ...prev]);
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Homes</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          + Add Home
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : homesList.length === 0 ? (
        <EmptyState
          title="No homes yet"
          description="Add your first home to start managing projects."
          action={
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              Add Home
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {homesList.map((home) => (
            <Link
              key={home.id}
              href={`/homes/${home.id}`}
              className="card p-5 hover:shadow-md transition-shadow"
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
          <div>
            <label className="label">Home Name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Primary Residence"
              required
            />
          </div>
          <div>
            <label className="label">Address Line 1</label>
            <input
              className="input"
              value={form.address1}
              onChange={(e) => update('address1', e.target.value)}
              placeholder="123 Main St"
              required
            />
          </div>
          <div>
            <label className="label">Address Line 2</label>
            <input
              className="input"
              value={form.address2}
              onChange={(e) => update('address2', e.target.value)}
              placeholder="Apt 2 (optional)"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="label">City</label>
              <input
                className="input"
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
                placeholder="Austin"
                required
              />
            </div>
            <div>
              <label className="label">State</label>
              <input
                className="input"
                value={form.state}
                onChange={(e) => update('state', e.target.value.toUpperCase())}
                placeholder="TX"
                maxLength={2}
                required
              />
            </div>
            <div>
              <label className="label">ZIP</label>
              <input
                className="input"
                value={form.zipCode}
                onChange={(e) => update('zipCode', e.target.value)}
                placeholder="78745"
                required
              />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea
              className="input"
              rows={3}
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              placeholder="Any notes about this property..."
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Create Home'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
