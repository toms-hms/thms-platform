'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { listHomes, listJobs } from './queries';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';

interface JobWithHome {
  id: string;
  title: string;
  category: string;
  status: string;
  createdAt: string;
  homeId: string;
  homeName: string;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobWithHome[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const JOB_STATUSES = [
    'DRAFT', 'PLANNING', 'REACHING_OUT', 'COMPARING_QUOTES',
    'SCHEDULED', 'IN_PROGRESS', 'AWAITING_PAYMENT', 'COMPLETED',
  ];

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const homesRes = await listHomes();
      const homes = homesRes.data;
      const jobsPerHome = await Promise.all(
        homes.map((home) =>
          listJobs(home.id).then((r) =>
            r.data.map((job) => ({ ...job, homeId: home.id, homeName: home.name }))
          ).catch(() => [] as JobWithHome[])
        )
      );
      setJobs(jobsPerHome.flat());
    } catch {}
    setLoading(false);
  }

  const filtered = statusFilter ? jobs.filter((j) => j.status === statusFilter) : jobs;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">All Jobs</h1>
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

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No jobs found"
          description="Jobs you create under your homes will appear here."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((job) => (
            <Link
              key={job.id}
              href={`/homes/${job.homeId}/jobs/${job.id}`}
              className="card p-4 flex items-start justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{job.title}</h3>
                  <StatusBadge status={job.status} />
                </div>
                <div className="flex gap-3 mt-1 text-sm text-gray-500">
                  <span>{job.category}</span>
                  <span>·</span>
                  <span>{job.homeName}</span>
                </div>
              </div>
              <span className="text-gray-400 text-sm ml-4 shrink-0">
                {new Date(job.createdAt).toLocaleDateString()}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
