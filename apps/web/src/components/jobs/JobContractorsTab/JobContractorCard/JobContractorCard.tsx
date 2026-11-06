'use client';
import { useMutation } from '@apollo/client/react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import { JobDetailDocument } from '@/components/jobs/queries/__generated__/JobDetail.generated';
import { JobContractorStatus } from '@/graphql/types.generated';
import type { JobContractorRow } from '../types';
import { DeleteJobContractorDocument } from './mutations/__generated__/DeleteJobContractor.generated';
import { UpdateJobContractorDocument } from './mutations/__generated__/UpdateJobContractor.generated';

/** Statuses in the order outreach moves through them. */
const STATUSES = [
  JobContractorStatus.NOT_CONTACTED,
  JobContractorStatus.CONTACTED,
  JobContractorStatus.RESPONDED,
  JobContractorStatus.VISIT_REQUESTED,
  JobContractorStatus.VISIT_SCHEDULED,
  JobContractorStatus.VISIT_COMPLETED,
  JobContractorStatus.QUOTE_RECEIVED,
  JobContractorStatus.DECLINED,
  JobContractorStatus.ACCEPTED,
  JobContractorStatus.WORK_IN_PROGRESS,
  JobContractorStatus.WORK_COMPLETED,
  JobContractorStatus.PAID,
];

/** One contractor on the job: who they are, where outreach stands, and when they were contacted. */
export default function JobContractorCard({ jobContractor }: { jobContractor: JobContractorRow }) {
  const [updateJobContractor] = useMutation(UpdateJobContractorDocument);
  const [deleteJobContractor] = useMutation(DeleteJobContractorDocument, { refetchQueries: [JobDetailDocument] });
  const { contractor } = jobContractor;

  async function handleStatusChange(status: string) {
    try {
      await updateJobContractor({ variables: { jobContractorId: jobContractor.id, status: status as JobContractorStatus } });
    } catch {}
  }

  async function handleRemove() {
    if (!confirm('Remove contractor from this job?')) return;
    try {
      await deleteJobContractor({ variables: { jobContractorId: jobContractor.id } });
    } catch {}
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-gray-900">{contractor.name}</p>
          {contractor.companyName && <p className="text-sm text-gray-500">{contractor.companyName}</p>}
          {contractor.email && <p className="text-xs text-gray-400">{contractor.email}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Select className="text-xs py-1 w-auto" onChange={(e) => handleStatusChange(e.target.value)} value={jobContractor.status}>
            {STATUSES.map((status) => (
              <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>
            ))}
          </Select>
          <Button className="text-gray-400 hover:text-red-500 text-sm" onClick={handleRemove} variant="bare">
            ✕
          </Button>
        </div>
      </div>
      {jobContractor.notes && <p className="text-xs text-gray-400 mt-2">{jobContractor.notes}</p>}
      <div className="mt-1 flex gap-4 text-xs text-gray-400">
        {jobContractor.lastContactedAt && (
          <span>Contacted: {new Date(jobContractor.lastContactedAt).toLocaleDateString()}</span>
        )}
        {jobContractor.lastResponseAt && (
          <span>Responded: {new Date(jobContractor.lastResponseAt).toLocaleDateString()}</span>
        )}
      </div>
    </Card>
  );
}
