'use client';
import { useState, FormEvent } from 'react';
import Link from '@/components/ui/Link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@apollo/client/react';
import { JobsDocument } from './queries/__generated__/Jobs.generated';
import { JobsHomesDocument } from './queries/__generated__/JobsHomes.generated';
import { JobsCreateHomeDocument } from './mutations/__generated__/JobsCreateHome.generated';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import PageHeader from '@/components/ui/PageHeader';

const JOB_STATUSES = [
  'DRAFT', 'PLANNING', 'REACHING_OUT', 'COMPARING_QUOTES',
  'SCHEDULED', 'IN_PROGRESS', 'AWAITING_PAYMENT', 'COMPLETED',
];

export default function JobsPage() {
  const router = useRouter();
  const homesQuery = useQuery(JobsHomesDocument);
  const jobsQuery = useQuery(JobsDocument);
  const [createHome] = useMutation(JobsCreateHomeDocument);
  const homes = homesQuery.data?.homes ?? [];
  const jobs = (jobsQuery.data?.jobs ?? [])
    .map((job) => ({ ...job, homeId: job.home.id, homeName: job.home.name }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const loading = (homesQuery.loading && !homesQuery.data) || (jobsQuery.loading && !jobsQuery.data);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [modalState, setModalState] = useState<'pick' | 'add'>('pick');
  const [addForm, setAddForm] = useState({ name: '', address1: '', city: '', state: '', zipCode: '' });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState('');

  function openModal() {
    setModalState('pick');
    setAddForm({ name: '', address1: '', city: '', state: '', zipCode: '' });
    setAddError('');
    setShowModal(true);
  }

  async function handleCreateHome(e: FormEvent) {
    e.preventDefault();
    setAddSaving(true);
    setAddError('');
    try {
      const { data } = await createHome({ variables: { ...addForm, country: 'US' } });
      const home = data?.createHome?.home;
      if (!home) throw new Error('Failed to create home');
      setShowModal(false);
      router.push(`/homes/${home.id}/jobs/new`);
    } catch (err: any) {
      setAddError(err.message || 'Failed to create home');
    } finally {
      setAddSaving(false);
    }
  }

  const filtered = jobs.filter((j) => {
    if (statusFilter && j.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        j.title.toLowerCase().includes(q) ||
        j.homeName.toLowerCase().includes(q) ||
        j.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div>
      <PageHeader
        actions={<Button onClick={openModal} variant="primary">+ New Job</Button>}
        title="All Jobs"
      />

      {/* Row 2: search + filter */}
      <div className="flex gap-3 mb-5">
        <Input
          type="text"
          className="max-w-xs"
          placeholder="Search jobs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          className="max-w-xs"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {JOB_STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={search || statusFilter ? 'No jobs match your filters' : 'No jobs yet'}
          description={search || statusFilter ? 'Try adjusting your search or filter.' : 'Create a job to get started.'}
          action={!search && !statusFilter ? <Button variant="primary" onClick={openModal}>New Job</Button> : undefined}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((job) => (
            <Link
              variant="card"
              key={job.id}
              href={`/homes/${job.homeId}/jobs/${job.id}`}
              className="p-4 flex items-start justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-ink">{job.title}</h3>
                  <StatusBadge status={job.status} />
                </div>
                <div className="flex gap-2 mt-1 text-sm text-gray-400">
                  <span>{job.category?.replace(/_/g, ' ')}</span>
                  <span>·</span>
                  <span>{job.homeName}</span>
                </div>
              </div>
              <span className="text-gray-300 text-sm ml-4 shrink-0">
                {new Date(job.createdAt).toLocaleDateString()}
              </span>
            </Link>
          ))}
        </div>
      )}

      <Modal
        title={modalState === 'pick' ? 'Select a home' : 'Add a home'}
        open={showModal}
        onClose={() => setShowModal(false)}
      >
        {modalState === 'pick' ? (
          <div>
            <p className="text-sm text-gray-500 mb-4">Choose which home this job is for.</p>
            {homes.length > 0 && (
              <div className="space-y-2 mb-3">
                {homes.map((home) => (
                  <Button
                    variant="bare"
                    key={home.id}
                    onClick={() => { setShowModal(false); router.push(`/homes/${home.id}/jobs/new`); }}
                    className="w-full text-left p-4 rounded-xl border-2 border-gray-100 hover:border-brand-400 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                  >
                    <div className="font-semibold text-ink text-sm">{home.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{home.fullAddress}</div>
                  </Button>
                ))}
              </div>
            )}
            <Button
              variant="bare"
              onClick={() => { setModalState('add'); setAddError(''); }}
              className="w-full p-4 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-500 hover:border-brand-400 hover:text-brand-700 transition-all text-center"
            >
              + Add a new home
            </Button>
          </div>
        ) : (
          <form onSubmit={handleCreateHome} className="space-y-4">
            <p className="text-sm text-gray-500">Fill in the basics — you can add more detail later.</p>
            {addError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{addError}</div>
            )}
            <Field label="Home name">
              <Input placeholder="Main Residence" value={addForm.name}
                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} required />
            </Field>
            <Field label="Street address">
              <Input placeholder="123 Maple St" value={addForm.address1}
                onChange={(e) => setAddForm((f) => ({ ...f, address1: e.target.value }))} required />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="City">
                <Input placeholder="Austin" value={addForm.city}
                  onChange={(e) => setAddForm((f) => ({ ...f, city: e.target.value }))} required />
              </Field>
              <Field label="State">
                <Input placeholder="TX" maxLength={2} value={addForm.state}
                  onChange={(e) => setAddForm((f) => ({ ...f, state: e.target.value.toUpperCase() }))} required />
              </Field>
              <Field label="ZIP">
                <Input placeholder="78701" value={addForm.zipCode}
                  onChange={(e) => setAddForm((f) => ({ ...f, zipCode: e.target.value }))} required />
              </Field>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button variant="muted" onClick={() => setModalState('pick')}>
                ← Back
              </Button>
              <Button variant="primary" type="submit" disabled={addSaving} className="ml-auto">
                {addSaving ? 'Creating...' : 'Create & continue →'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
