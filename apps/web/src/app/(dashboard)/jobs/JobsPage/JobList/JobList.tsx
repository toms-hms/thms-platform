import Link from '@/components/ui/Link';
import StatusBadge from '@/components/ui/StatusBadge';
import type { JobRow } from '../types';

/** The jobs as cards: title and status, category and home, and when each was created. */
export default function JobList({ jobs }: { jobs: JobRow[] }) {
  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <Link
          className="p-4 flex items-start justify-between"
          href={`/homes/${job.home.id}/jobs/${job.id}`}
          key={job.id}
          variant="card"
        >
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-ink">{job.title}</h3>
              <StatusBadge status={job.status} />
            </div>
            <div className="flex gap-2 mt-1 text-sm text-gray-400">
              <span>{job.category?.replace(/_/g, ' ')}</span>
              <span>·</span>
              <span>{job.home.name}</span>
            </div>
          </div>
          <span className="text-gray-300 text-sm ml-4 shrink-0">{new Date(job.createdAt).toLocaleDateString()}</span>
        </Link>
      ))}
    </div>
  );
}
