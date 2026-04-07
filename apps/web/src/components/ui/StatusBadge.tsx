const JOB_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PLANNING: 'bg-blue-100 text-blue-700',
  REACHING_OUT: 'bg-yellow-100 text-yellow-700',
  COMPARING_QUOTES: 'bg-purple-100 text-purple-700',
  SCHEDULED: 'bg-indigo-100 text-indigo-700',
  IN_PROGRESS: 'bg-orange-100 text-orange-700',
  AWAITING_PAYMENT: 'bg-pink-100 text-pink-700',
  COMPLETED: 'bg-green-100 text-green-700',
};

const CONTRACTOR_STATUS_COLORS: Record<string, string> = {
  NOT_CONTACTED: 'bg-gray-100 text-gray-600',
  CONTACTED: 'bg-blue-100 text-blue-700',
  RESPONDED: 'bg-cyan-100 text-cyan-700',
  VISIT_REQUESTED: 'bg-yellow-100 text-yellow-700',
  VISIT_SCHEDULED: 'bg-yellow-100 text-yellow-800',
  VISIT_COMPLETED: 'bg-lime-100 text-lime-700',
  QUOTE_RECEIVED: 'bg-purple-100 text-purple-700',
  DECLINED: 'bg-red-100 text-red-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  WORK_IN_PROGRESS: 'bg-orange-100 text-orange-700',
  WORK_COMPLETED: 'bg-teal-100 text-teal-700',
  PAID: 'bg-emerald-100 text-emerald-700',
};

function formatLabel(status: string) {
  return status.replace(/_/g, ' ');
}

interface Props {
  status: string;
  type?: 'job' | 'contractor';
}

export default function StatusBadge({ status, type = 'job' }: Props) {
  const colorMap = type === 'contractor' ? CONTRACTOR_STATUS_COLORS : JOB_STATUS_COLORS;
  const color = colorMap[status] || 'bg-gray-100 text-gray-700';
  return (
    <span className={`badge ${color}`}>{formatLabel(status)}</span>
  );
}
