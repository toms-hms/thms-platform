'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { useMutation } from '@apollo/client/react';
import { BADGE_CLASSES } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Textarea from '@/components/ui/Textarea';
import { TradeCategory } from '@/graphql/types.generated';
import { cn } from '@/lib/cn';
import { TRADE_CATEGORY_LABELS } from '@/lib/tradeCategories';
import type { ContractorDetail } from '../types';
import { UpdateContractorDetailsDocument } from './mutations/__generated__/UpdateContractorDetails.generated';

function formFrom(contractor: ContractorDetail) {
  return {
    categories: contractor.categories as TradeCategory[],
    companyName: contractor.companyName || '',
    email: contractor.email || '',
    name: contractor.name,
    notes: contractor.notes || '',
    phone: contractor.phone || '',
    zipCodes: contractor.zipCodes,
  };
}

interface ContractorEditModalProps {
  contractor: ContractorDetail;
  onClose: () => void;
  open: boolean;
}

/** The admin edit form. Saving updates the page through Apollo's cache. */
export default function ContractorEditModal({ contractor, onClose, open }: ContractorEditModalProps) {
  const [form, setForm] = useState(() => formFrom(contractor));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [updateContractor] = useMutation(UpdateContractorDetailsDocument);

  useEffect(() => {
    if (!open) return;
    setForm(formFrom(contractor));
    setError('');
  }, [contractor, open]);

  function toggleCategory(category: TradeCategory) {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(category)
        ? f.categories.filter((c) => c !== category)
        : [...f.categories, category],
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await updateContractor({ variables: { contractorId: contractor.id, ...form } });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose} open={open} title="Edit Contractor">
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name">
            <Input onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required value={form.name} />
          </Field>
          <Field label="Company">
            <Input onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))} value={form.companyName} />
          </Field>
        </div>
        <Field label="Categories">
          <div className="flex flex-wrap gap-2 mt-1">
            {Object.values(TradeCategory).map((category) => (
              <Button
                className={cn(
                  BADGE_CLASSES,
                  'cursor-pointer transition-colors',
                  form.categories.includes(category)
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                )}
                key={category}
                onClick={() => toggleCategory(category)}
                variant="bare"
              >
                {TRADE_CATEGORY_LABELS[category]}
              </Button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email">
            <Input onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} type="email" value={form.email} />
          </Field>
          <Field label="Phone">
            <Input onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} value={form.phone} />
          </Field>
        </div>
        <Field label="Notes">
          <Textarea onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} value={form.notes} />
        </Field>
        <div className="flex gap-3 justify-end">
          <Button onClick={onClose} variant="secondary">Cancel</Button>
          <Button disabled={saving} type="submit" variant="primary">
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
