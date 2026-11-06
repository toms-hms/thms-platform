import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { JobStatus } from '@/graphql/types.generated';
import type { JobFilterValues } from '../types';

/** Statuses in lifecycle order, which is the order a user scans them in. */
const JOB_STATUSES = [
  JobStatus.DRAFT,
  JobStatus.PLANNING,
  JobStatus.REACHING_OUT,
  JobStatus.COMPARING_QUOTES,
  JobStatus.SCHEDULED,
  JobStatus.IN_PROGRESS,
  JobStatus.AWAITING_PAYMENT,
  JobStatus.COMPLETED,
];

interface JobFiltersProps {
  onChange: (value: JobFilterValues) => void;
  value: JobFilterValues;
}

/** The search box and status filter above the job list. */
export default function JobFilters({ onChange, value }: JobFiltersProps) {
  return (
    <div className="flex gap-3 mb-5">
      <Input
        className="max-w-xs"
        onChange={(e) => onChange({ ...value, search: e.target.value })}
        placeholder="Search jobs..."
        type="text"
        value={value.search}
      />
      <Select className="max-w-xs" onChange={(e) => onChange({ ...value, status: e.target.value })} value={value.status}>
        <option value="">All statuses</option>
        {JOB_STATUSES.map((status) => (
          <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>
        ))}
      </Select>
    </div>
  );
}
