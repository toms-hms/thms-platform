'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getHome, listJobs } from './queries';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';

const JOB_STATUSES = [
  'DRAFT', 'PLANNING', 'REACHING_OUT', 'COMPARING_QUOTES',
  'SCHEDULED', 'IN_PROGRESS', 'AWAITING_PAYMENT', 'COMPLETED',
];

const INTENT_LABELS: Record<string, string> = {
  ISSUE: 'Fix',
  IMPROVEMENT: 'Improve',
  RECURRING_WORK: 'Maintenance',
};

export default function HomeDetailPage() {
  const { homeId } = useParams<{ homeId: string }>();
  const [home, setHome] = useState<any>(null);
  const [jobsList, setJobsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    if (homeId) loadData();
  }, [homeId]);

  async function loadData() {
    try {
      const [homeRes, jobsRes] = await Promise.all([
        getHome(homeId),
        listJobs(homeId),
      ]);
      setHome(homeRes.data);
      setJobsList(jobsRes.data);
    } catch {}
    setLoading(false);
  }

  const filteredJobs = statusFilter
    ? jobsList.filter((j) => j.status === statusFilter)
    : jobsList;

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;
  if (!home) return <div className="text-center py-12 text-gray-400">Home not found</div>;

  return (
    <div>
      <div className="mb-6">
        <Link href="/homes" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          ← My Homes
        </Link>
        <h1 className="text-2xl font-bold text-ink mt-1">{home.name}</h1>
        <p className="text-gray-400 text-sm">{home.fullAddress}</p>
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
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <Link href={`/homes/${homeId}/jobs/new`} className="btn-primary">
          + New Request
        </Link>
      </div>

      {filteredJobs.length === 0 ? (
        <EmptyState
          title="No jobs yet"
          description="Start a new request to get quotes from contractors."
          action={
            <Link href={`/homes/${homeId}/jobs/new`} className="btn-primary">
              New Request
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredJobs.map((job) => (
            <Link
              key={job.id}
              href={`/homes/${homeId}/jobs/${job.id}`}
              className="card p-4 flex items-start justify-between hover:shadow-md transition-shadow block"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-ink">{job.title}</h3>
                  <StatusBadge status={job.status} />
                  {job.intent && job.intent !== 'ISSUE' && (
                    <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {INTENT_LABELS[job.intent] ?? job.intent}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400 mt-0.5">{job.category?.replace(/_/g, ' ')}</p>
                {job.description && (
                  <p className="text-sm text-gray-300 mt-1 line-clamp-1">{job.description}</p>
                )}
              </div>
              <span className="text-gray-300 text-sm ml-4 shrink-0">
                {new Date(job.createdAt).toLocaleDateString()}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
