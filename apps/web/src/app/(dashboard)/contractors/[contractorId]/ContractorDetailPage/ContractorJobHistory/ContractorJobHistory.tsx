'use client';
import { useQuery } from '@apollo/client/react';
import EmptyState from '@/components/ui/EmptyState';
import Link from '@/components/ui/Link';
import StatusBadge from '@/components/ui/StatusBadge';
import { ContractorJobHistoryDocument } from './queries/__generated__/ContractorJobHistory.generated';

/** Every job the contractor has been assigned to, with their status on it and the job's own status. */
export default function ContractorJobHistory({ contractorId }: { contractorId: string }) {
  const { data, loading } = useQuery(ContractorJobHistoryDocument, { variables: { contractorIds: [contractorId] } });
  const jobs = data?.contractorJobHistory ?? [];

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Job History</h2>
      {loading && !data ? (
        <div className="text-center py-8 text-gray-400">Loading...</div>
      ) : jobs.length === 0 ? (
        <EmptyState description="This contractor hasn't been assigned to any jobs." title="No jobs yet" />
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Link
              className="p-4 flex items-center justify-between"
              href={`/homes/${job.homeId}/jobs/${job.jobId}`}
              key={job.jobId}
              variant="card"
            >
              <div>
                <h3 className="font-medium text-gray-900">{job.jobTitle}</h3>
                <p className="text-sm text-gray-400 mt-0.5">{job.homeName}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <StatusBadge status={job.contractorStatus} type="contractor" />
                <StatusBadge status={job.jobStatus} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
