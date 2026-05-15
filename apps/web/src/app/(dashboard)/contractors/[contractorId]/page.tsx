'use client';
import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { TradeCategory } from '@thms/shared';
import { getContractor, getContractorJobs } from '../queries';
import { updateContractor } from '../mutations';
import { getStoredUser } from '@/lib/auth';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';

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

export default function ContractorDetailPage() {
  const { contractorId } = useParams<{ contractorId: string }>();
  const [contractor, setContractor] = useState<any>(null);
  const [jobHistory, setJobHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [form, setForm] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    categories: [] as TradeCategory[],
    zipCodes: [] as string[],
    notes: '',
  });

  useEffect(() => {
    const user = getStoredUser();
    setIsAdmin(user?.role === 'ADMIN');
    if (contractorId) loadData();
  }, [contractorId]);

  async function loadData() {
    try {
      const [cRes, jRes] = await Promise.all([
        getContractor(contractorId),
        getContractorJobs(contractorId),
      ]);
      setContractor(cRes.data);
      setJobHistory(jRes.data);
    } catch {}
    setLoading(false);
  }

  function openEdit() {
    setForm({
      name: contractor.name,
      companyName: contractor.companyName || '',
      email: contractor.email || '',
      phone: contractor.phone || '',
      categories: contractor.categories || [],
      zipCodes: contractor.zipCodes || [],
      notes: contractor.notes || '',
    });
    setEditError('');
    setShowEdit(true);
  }

  function toggleCategory(cat: TradeCategory) {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter((c) => c !== cat)
        : [...f.categories, cat],
    }));
  }

  async function handleEditSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setEditError('');
    try {
      const res = await updateContractor(contractorId, form);
      setContractor(res.data);
      setShowEdit(false);
    } catch (err: any) {
      setEditError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;
  if (!contractor) return <div className="text-center py-12 text-gray-400">Contractor not found</div>;

  return (
    <div>
      <div className="mb-6">
        <Link href="/contractors" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          ← Contractors
        </Link>
        <div className="flex items-start justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{contractor.name}</h1>
            {contractor.companyName && (
              <p className="text-gray-500 text-sm mt-0.5">{contractor.companyName}</p>
            )}
          </div>
          {isAdmin && (
            <button onClick={openEdit} className="btn-secondary text-sm">
              Edit
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="card p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Details</h2>
          <div className="space-y-4">
            <div>
              <span className="text-xs text-gray-400 block mb-1.5">Categories</span>
              <div className="flex flex-wrap gap-1.5">
                {(contractor.categories || []).map((cat: string) => (
                  <span key={cat} className="badge bg-blue-50 text-blue-700">
                    {CATEGORY_LABELS[cat as TradeCategory] ?? cat}
                  </span>
                ))}
              </div>
            </div>
            {contractor.zipCodes?.length > 0 && (
              <div>
                <span className="text-xs text-gray-400 block mb-1.5">Zip Codes Serviced</span>
                <div className="flex flex-wrap gap-1.5">
                  {contractor.zipCodes.map((z: string) => (
                    <span key={z} className="badge bg-gray-100 text-gray-600">{z}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Contact</h2>
          <div className="space-y-2 text-sm">
            {contractor.email && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400 w-14 shrink-0">Email</span>
                <a href={`mailto:${contractor.email}`} className="text-blue-600 hover:text-blue-700 truncate">
                  {contractor.email}
                </a>
              </div>
            )}
            {contractor.phone && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400 w-14 shrink-0">Phone</span>
                <a href={`tel:${contractor.phone}`} className="text-gray-900">{contractor.phone}</a>
              </div>
            )}
            {!contractor.email && !contractor.phone && (
              <p className="text-gray-400">No contact info on file</p>
            )}
            {contractor.notes && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-400 block mb-1">Notes</span>
                <p className="text-gray-600">{contractor.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Job History</h2>
        {jobHistory.length === 0 ? (
          <EmptyState
            title="No jobs yet"
            description="This contractor hasn't been assigned to any jobs."
          />
        ) : (
          <div className="space-y-3">
            {jobHistory.map((j) => (
              <Link
                key={j.jobId}
                href={`/homes/${j.homeId}/jobs/${j.jobId}`}
                className="card p-4 flex items-center justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  <h3 className="font-medium text-gray-900">{j.jobTitle}</h3>
                  <p className="text-sm text-gray-400 mt-0.5">{j.homeName}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <StatusBadge status={j.contractorStatus} type="contractor" />
                  <StatusBadge status={j.jobStatus} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Modal title="Edit Contractor" open={showEdit} onClose={() => setShowEdit(false)}>
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {editError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {editError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Company</label>
              <input
                className="input"
                value={form.companyName}
                onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="label">Categories</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {Object.values(TradeCategory).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`badge cursor-pointer transition-colors ${
                    form.categories.includes(cat)
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Phone</label>
              <input
                className="input"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea
              className="input"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowEdit(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
