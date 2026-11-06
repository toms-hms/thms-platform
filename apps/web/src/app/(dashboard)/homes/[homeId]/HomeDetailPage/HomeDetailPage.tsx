'use client';
import { useState } from 'react';
import Link from '@/components/ui/Link';
import { useParams } from 'next/navigation';
import { useQuery } from '@apollo/client/react';
import { HomeDocument } from './queries/__generated__/Home.generated';
import { HomeJobsDocument } from './queries/__generated__/HomeJobs.generated';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import Select from '@/components/ui/Select';
import PageHeader from '@/components/ui/PageHeader';
import { JOB_STATUSES, jobStatusLabel } from '@/lib/jobStatuses';

const INTENT_LABELS: Record<string, string> = {
  ISSUE: 'Fix',
  IMPROVEMENT: 'Improve',
  RECURRING_WORK: 'Maintenance',
};

export default function HomeDetailPage() {
  const { homeId } = useParams<{ homeId: string }>();
  const [statusFilter, setStatusFilter] = useState('');
  const homeQuery = useQuery(HomeDocument, { variables: { homeId } });
  const jobsQuery = useQuery(HomeJobsDocument, { variables: { homeIds: [homeId] } });
  const home = homeQuery.data?.home;
  const jobsList = jobsQuery.data?.jobs ?? [];
  const loading = (homeQuery.loading && !homeQuery.data) || (jobsQuery.loading && !jobsQuery.data);

  const filteredJobs = statusFilter
    ? jobsList.filter((j) => j.status === statusFilter)
    : jobsList;

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;
  if (!home) return <div className="text-center py-12 text-gray-400">Home not found</div>;

  return (
    <div>
      <PageHeader back={{ href: '/homes', label: 'My Homes' }} subtitle={home.fullAddress} title={home.name} />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-800">Jobs</h2>
          <Select
            className="w-auto py-1 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            {JOB_STATUSES.map((s) => (
              <option key={s} value={s}>{jobStatusLabel(s)}</option>
            ))}
          </Select>
        </div>
        <Link variant="primary" href={`/homes/${homeId}/jobs/new`}>
          + New Request
        </Link>
      </div>

      {filteredJobs.length === 0 ? (
        <EmptyState
          title="No jobs yet"
          description="Start a new request to get quotes from contractors."
          action={
            <Link variant="primary" href={`/homes/${homeId}/jobs/new`}>
              New Request
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredJobs.map((job) => (
            <Link
              variant="card"
              key={job.id}
              href={`/homes/${homeId}/jobs/${job.id}`}
              className="p-4 flex items-start justify-between"
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
