'use client';
import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { homes, jobs } from '@/lib/api';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';

const JOB_STATUSES = [
  'DRAFT', 'PLANNING', 'REACHING_OUT', 'COMPARING_QUOTES',
  'SCHEDULED', 'IN_PROGRESS', 'AWAITING_PAYMENT', 'COMPLETED',
];

export default function HomeDetailPage() {
  const { homeId } = useParams<{ homeId: string }>();
  const [home, setHome] = useState<any>(null);
  const [jobsList, setJobsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState({
    title: '',
    category: '',
    description: '',
    notes: '',
    status: 'DRAFT',
  });

  useEffect(() => {
    if (homeId) loadData();
  }, [homeId]);

  async function loadData() {
    try {
      const [homeRes, jobsRes] = await Promise.all([
        homes.get(homeId),
        jobs.list(homeId),
      ]);
      setHome(homeRes.data);
      setJobsList(jobsRes.data);
    } catch {}
    setLoading(false);
  }

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleCreateJob(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await jobs.create(homeId, form);
      setJobsList((prev) => [res.data, ...prev]);
      setShowCreate(false);
      setForm({ title: '', category: '', description: '', notes: '', status: 'DRAFT' });
    } catch (err: any) {
      setError(err.message || 'Failed to create job');
    } finally {
      setSaving(false);
    }
  }

  const filteredJobs = statusFilter
    ? jobsList.filter((j) => j.status === statusFilter)
    : jobsList;

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;
  if (!home) return <div className="text-center py-12 text-gray-500">Home not found</div>;

  return (
    <div>
      <div className="mb-6">
        <Link href="/homes" className="text-sm text-gray-500 hover:text-gray-700">
          ← My Homes
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">{home.name}</h1>
        <p className="text-gray-500 text-sm">{home.fullAddress}</p>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-800">Jobs</h2>
          <select
            className="input w-auto py-1 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            {JOB_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          + New Job
        </button>
      </div>

      {filteredJobs.length === 0 ? (
        <EmptyState
          title="No jobs yet"
          description="Create a job to track a home project."
          action={
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              New Job
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredJobs.map((job) => (
            <Link
              key={job.id}
              href={`/homes/${homeId}/jobs/${job.id}`}
              className="card p-4 flex items-start justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{job.title}</h3>
                  <StatusBadge status={job.status} />
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{job.category}</p>
                {job.description && (
                  <p className="text-sm text-gray-400 mt-1 line-clamp-1">{job.description}</p>
                )}
              </div>
              <span className="text-gray-400 text-sm ml-4 shrink-0">
                {new Date(job.createdAt).toLocaleDateString()}
              </span>
            </Link>
          ))}
        </div>
      )}

      <Modal title="New Job" open={showCreate} onClose={() => setShowCreate(false)}>
        <form onSubmit={handleCreateJob} className="space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </div>
          )}
          <div>
            <label className="label">Job Title</label>
            <input
              className="input"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="Backyard Deck"
              required
            />
          </div>
          <div>
            <label className="label">Category</label>
            <input
              className="input"
              value={form.category}
              onChange={(e) => update('category', e.target.value)}
              placeholder="deck, landscaping, plumbing..."
              required
            />
          </div>
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={form.status}
              onChange={(e) => update('status', e.target.value)}
            >
              {JOB_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input"
              rows={3}
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Describe what you want done..."
            />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea
              className="input"
              rows={2}
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              placeholder="Internal notes..."
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Creating...' : 'Create Job'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
