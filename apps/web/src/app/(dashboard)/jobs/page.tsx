'use client';
import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { listHomes, listJobs } from './queries';
import { request } from '@/lib/api';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';

interface Home { id: string; name: string; fullAddress: string; }
interface JobWithHome {
  id: string;
  title: string;
  category: string;
  status: string;
  createdAt: string;
  homeId: string;
  homeName: string;
}

const JOB_STATUSES = [
  'DRAFT', 'PLANNING', 'REACHING_OUT', 'COMPARING_QUOTES',
  'SCHEDULED', 'IN_PROGRESS', 'AWAITING_PAYMENT', 'COMPLETED',
];

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobWithHome[]>([]);
  const [homes, setHomes] = useState<Home[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [modalState, setModalState] = useState<'pick' | 'add'>('pick');
  const [addForm, setAddForm] = useState({ name: '', address1: '', city: '', state: '', zipCode: '' });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const homesRes = await listHomes();
      const loadedHomes: Home[] = homesRes.data;
      setHomes(loadedHomes);
      const jobsPerHome = await Promise.all(
        loadedHomes.map((home) =>
          listJobs(home.id)
            .then((r) => r.data.map((job) => ({ ...job, homeId: home.id, homeName: home.name })))
            .catch(() => [] as JobWithHome[])
        )
      );
      setJobs(
        jobsPerHome.flat().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      );
    } catch {}
    setLoading(false);
  }

  function openModal() {
    setModalState('pick');
    setAddForm({ name: '', address1: '', city: '', state: '', zipCode: '' });
    setAddError('');
    setShowModal(true);
  }

  async function handleCreateHome(e: FormEvent) {
    e.preventDefault();
    setAddSaving(true);
    setAddError('');
    try {
      const res = await request<{ data: any }>('/api/v1/homes', {
        method: 'POST',
        body: JSON.stringify({ ...addForm, country: 'US' }),
      });
      setShowModal(false);
      router.push(`/homes/${res.data.id}/jobs/new`);
    } catch (err: any) {
      setAddError(err.message || 'Failed to create home');
    } finally {
      setAddSaving(false);
    }
  }

  const filtered = jobs.filter((j) => {
    if (statusFilter && j.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        j.title.toLowerCase().includes(q) ||
        j.homeName.toLowerCase().includes(q) ||
        j.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div>
      {/* Row 1: title + button */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-ink">All Jobs</h1>
        <button onClick={openModal} className="btn-primary">+ New Job</button>
      </div>

      {/* Row 2: search + filter */}
      <div className="flex gap-3 mb-5">
        <input
          type="text"
          className="input max-w-xs"
          placeholder="Search jobs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input max-w-xs"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {JOB_STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={search || statusFilter ? 'No jobs match your filters' : 'No jobs yet'}
          description={search || statusFilter ? 'Try adjusting your search or filter.' : 'Create a job to get started.'}
          action={!search && !statusFilter ? <button onClick={openModal} className="btn-primary">New Job</button> : undefined}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((job) => (
            <Link
              key={job.id}
              href={`/homes/${job.homeId}/jobs/${job.id}`}
              className="card p-4 flex items-start justify-between hover:shadow-md transition-shadow block"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-ink">{job.title}</h3>
                  <StatusBadge status={job.status} />
                </div>
                <div className="flex gap-2 mt-1 text-sm text-gray-400">
                  <span>{job.category?.replace(/_/g, ' ')}</span>
                  <span>·</span>
                  <span>{job.homeName}</span>
                </div>
              </div>
              <span className="text-gray-300 text-sm ml-4 shrink-0">
                {new Date(job.createdAt).toLocaleDateString()}
              </span>
            </Link>
          ))}
        </div>
      )}

      <Modal
        title={modalState === 'pick' ? 'Select a home' : 'Add a home'}
        open={showModal}
        onClose={() => setShowModal(false)}
      >
        {modalState === 'pick' ? (
          <div>
            <p className="text-sm text-gray-500 mb-4">Choose which home this job is for.</p>
            {homes.length > 0 && (
              <div className="space-y-2 mb-3">
                {homes.map((home) => (
                  <button
                    key={home.id}
                    onClick={() => { setShowModal(false); router.push(`/homes/${home.id}/jobs/new`); }}
                    className="w-full text-left p-4 rounded-xl border-2 border-gray-100 hover:border-brand-400 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                  >
                    <div className="font-semibold text-ink text-sm">{home.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{home.fullAddress}</div>
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => { setModalState('add'); setAddError(''); }}
              className="w-full p-4 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-500 hover:border-brand-400 hover:text-brand-700 transition-all text-center"
            >
              + Add a new home
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreateHome} className="space-y-4">
            <p className="text-sm text-gray-500">Fill in the basics — you can add more detail later.</p>
            {addError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{addError}</div>
            )}
            <div>
              <label className="label">Home name</label>
              <input className="input" placeholder="Main Residence" value={addForm.name}
                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Street address</label>
              <input className="input" placeholder="123 Maple St" value={addForm.address1}
                onChange={(e) => setAddForm((f) => ({ ...f, address1: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">City</label>
                <input className="input" placeholder="Austin" value={addForm.city}
                  onChange={(e) => setAddForm((f) => ({ ...f, city: e.target.value }))} required />
              </div>
              <div>
                <label className="label">State</label>
                <input className="input" placeholder="TX" maxLength={2} value={addForm.state}
                  onChange={(e) => setAddForm((f) => ({ ...f, state: e.target.value.toUpperCase() }))} required />
              </div>
              <div>
                <label className="label">ZIP</label>
                <input className="input" placeholder="78701" value={addForm.zipCode}
                  onChange={(e) => setAddForm((f) => ({ ...f, zipCode: e.target.value }))} required />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button type="button" onClick={() => setModalState('pick')} className="text-sm text-gray-500 hover:text-gray-700">
                ← Back
              </button>
              <button type="submit" disabled={addSaving} className="btn-primary ml-auto">
                {addSaving ? 'Creating...' : 'Create & continue →'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
