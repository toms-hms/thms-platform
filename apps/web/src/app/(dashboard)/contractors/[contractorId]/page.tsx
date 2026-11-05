'use client';
import { useState, useEffect, FormEvent } from 'react';
import Link from '@/components/ui/Link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery } from '@apollo/client/react';
import { TradeCategory } from '@/graphql/types.generated';
import { ContractorDocument } from './queries/__generated__/Contractor.generated';
import { ContractorJobHistoryDocument } from './queries/__generated__/ContractorJobHistory.generated';
import { UpdateContractorDetailsDocument } from './mutations/__generated__/UpdateContractorDetails.generated';
import { getStoredUser } from '@/lib/auth';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Badge, { BADGE_CLASSES } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import PageHeader from '@/components/ui/PageHeader';

const CATEGORY_LABELS: Record<TradeCategory, string> = {
  [TradeCategory.PLUMBING]:            'Plumbing',
  [TradeCategory.ELECTRICAL]:          'Electrical',
  [TradeCategory.HVAC]:                'HVAC',
  [TradeCategory.ROOFING]:             'Roofing',
  [TradeCategory.PAINTING]:            'Painting',
  [TradeCategory.LANDSCAPING]:         'Landscaping',
  [TradeCategory.GENERAL_CONTRACTING]: 'General Contracting',
  [TradeCategory.CARPENTRY]:           'Carpentry',
  [TradeCategory.FLOORING]:            'Flooring',
  [TradeCategory.PEST_CONTROL]:        'Pest Control',
  [TradeCategory.DOORS_AND_WINDOWS]:   'Doors & Windows',
  [TradeCategory.POOL_AND_SPA]:        'Pool & Spa',
};

export default function ContractorDetailPage() {
  const { contractorId } = useParams<{ contractorId: string }>();
  const contractorQuery = useQuery(ContractorDocument, { variables: { contractorId } });
  const historyQuery = useQuery(ContractorJobHistoryDocument, { variables: { contractorIds: [contractorId] } });
  const [updateContractor] = useMutation(UpdateContractorDetailsDocument);
  const contractor = contractorQuery.data?.contractor;
  const jobHistory = historyQuery.data?.contractorJobHistory ?? [];
  const loading =
    (contractorQuery.loading && !contractorQuery.data) || (historyQuery.loading && !historyQuery.data);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [form, setForm] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    categories: [] as TradeCategory[],
    zipCodes: [] as string[],
    notes: '',
  });

  useEffect(() => {
    const user = getStoredUser();
    setIsAdmin(user?.role === 'ADMIN');
  }, []);

  function openEdit() {
    if (!contractor) return;
    setForm({
      name: contractor.name,
      companyName: contractor.companyName || '',
      email: contractor.email || '',
      phone: contractor.phone || '',
      categories: (contractor.categories || []) as TradeCategory[],
      zipCodes: contractor.zipCodes || [],
      notes: contractor.notes || '',
    });
    setEditError('');
    setShowEdit(true);
  }

  function toggleCategory(cat: TradeCategory) {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter((c) => c !== cat)
        : [...f.categories, cat],
    }));
  }

  async function handleEditSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setEditError('');
    try {
      await updateContractor({ variables: { contractorId, ...form } });
      setShowEdit(false);
    } catch (err: any) {
      setEditError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;
  if (!contractor) return <div className="text-center py-12 text-gray-400">Contractor not found</div>;

  return (
    <div>
      <PageHeader
        actions={
          isAdmin && (
            <Button className="text-sm" onClick={openEdit} variant="secondary">
              Edit
            </Button>
          )
        }
        back={{ href: '/contractors', label: 'Contractors' }}
        subtitle={contractor.companyName}
        title={contractor.name}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Details</h2>
          <div className="space-y-4">
            <div>
              <span className="text-xs text-gray-400 block mb-1.5">Categories</span>
              <div className="flex flex-wrap gap-1.5">
                {(contractor.categories || []).map((cat: string) => (
                  <Badge key={cat} className="bg-blue-50 text-blue-700">
                    {CATEGORY_LABELS[cat as TradeCategory] ?? cat}
                  </Badge>
                ))}
              </div>
            </div>
            {contractor.zipCodes?.length > 0 && (
              <div>
                <span className="text-xs text-gray-400 block mb-1.5">Zip Codes Serviced</span>
                <div className="flex flex-wrap gap-1.5">
                  {contractor.zipCodes.map((z: string) => (
                    <Badge key={z} className="bg-gray-100 text-gray-600">{z}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Contact</h2>
          <div className="space-y-2 text-sm">
            {contractor.email && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400 w-14 shrink-0">Email</span>
                <a href={`mailto:${contractor.email}`} className="text-blue-600 hover:text-blue-700 truncate">
                  {contractor.email}
                </a>
              </div>
            )}
            {contractor.phone && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400 w-14 shrink-0">Phone</span>
                <a href={`tel:${contractor.phone}`} className="text-gray-900">{contractor.phone}</a>
              </div>
            )}
            {!contractor.email && !contractor.phone && (
              <p className="text-gray-400">No contact info on file</p>
            )}
            {contractor.notes && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-400 block mb-1">Notes</span>
                <p className="text-gray-600">{contractor.notes}</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Job History</h2>
        {jobHistory.length === 0 ? (
          <EmptyState
            title="No jobs yet"
            description="This contractor hasn't been assigned to any jobs."
          />
        ) : (
          <div className="space-y-3">
            {jobHistory.map((j) => (
              <Link
                variant="card"
                key={j.jobId}
                href={`/homes/${j.homeId}/jobs/${j.jobId}`}
                className="p-4 flex items-center justify-between"
              >
                <div>
                  <h3 className="font-medium text-gray-900">{j.jobTitle}</h3>
                  <p className="text-sm text-gray-400 mt-0.5">{j.homeName}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <StatusBadge status={j.contractorStatus} type="contractor" />
                  <StatusBadge status={j.jobStatus} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Modal title="Edit Contractor" open={showEdit} onClose={() => setShowEdit(false)}>
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {editError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {editError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name">
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </Field>
            <Field label="Company">
              <Input
                value={form.companyName}
                onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
              />
            </Field>
          </div>
          <Field label="Categories">
            <div className="flex flex-wrap gap-2 mt-1">
              {Object.values(TradeCategory).map((cat) => (
                <Button
                  variant="bare"
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={cn(
                    BADGE_CLASSES,
                    'cursor-pointer transition-colors',
                    form.categories.includes(cat)
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  )}
                >
                  {CATEGORY_LABELS[cat]}
                </Button>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </Field>
            <Field label="Phone">
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </Field>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
