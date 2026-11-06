'use client';
import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import PageHeader from '@/components/ui/PageHeader';
import JobFilters from './JobFilters';
import JobList from './JobList';
import NewJobModal from './NewJobModal';
import { JobsDocument } from './queries/__generated__/Jobs.generated';
import { matchesFilters } from './matchesFilters';
import type { JobFilterValues } from './types';

const NO_FILTERS: JobFilterValues = { search: '', status: '' };

/** Every job across the caller's homes, newest first, with search and a status filter. */
export default function JobsPage() {
  const { data, loading } = useQuery(JobsDocument);
  const [filters, setFilters] = useState(NO_FILTERS);
  const [creating, setCreating] = useState(false);
  const jobs = [...(data?.jobs ?? [])]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .filter((job) => matchesFilters(job, filters));
  const filtering = Boolean(filters.search || filters.status);

  return (
    <div>
      <PageHeader actions={<Button onClick={() => setCreating(true)} variant="primary">+ New Job</Button>} title="All Jobs" />
      <JobFilters onChange={setFilters} value={filters} />

      {loading && !data ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : jobs.length === 0 ? (
        <EmptyState
          action={!filtering ? <Button onClick={() => setCreating(true)} variant="primary">New Job</Button> : undefined}
          description={filtering ? 'Try adjusting your search or filter.' : 'Create a job to get started.'}
          title={filtering ? 'No jobs match your filters' : 'No jobs yet'}
        />
      ) : (
        <JobList jobs={jobs} />
      )}

      <NewJobModal onClose={() => setCreating(false)} open={creating} />
    </div>
  );
}
