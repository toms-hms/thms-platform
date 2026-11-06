'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { useMutation } from '@apollo/client/react';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Selector from '@/components/ui/Selector';
import Textarea from '@/components/ui/Textarea';
import type { TradeCategory } from '@/graphql/types.generated';
import { TRADE_CATEGORY_OPTIONS } from '@/lib/tradeCategories';
import type { Contractor } from '../types';
import { CreateContractorDocument } from './mutations/__generated__/CreateContractor.generated';
import { UpdateContractorDocument } from './mutations/__generated__/UpdateContractor.generated';

const EMPTY_FORM = { category: '', companyName: '', email: '', name: '', notes: '', phone: '', zipCodes: '' };

function formFrom(contractor: Contractor): typeof EMPTY_FORM {
  return {
    category: contractor.categories[0] || '',
    companyName: contractor.companyName || '',
    email: contractor.email || '',
    name: contractor.name,
    notes: contractor.notes || '',
    phone: contractor.phone || '',
    zipCodes: contractor.zipCodes.join(', '),
  };
}

interface ContractorFormModalProps {
  /** The contractor to edit, `'new'` to add one, or `null` when the modal is closed. */
  contractor: Contractor | 'new' | null;
  onClose: () => void;
  /** Called after a create, so the list can refetch. Edits update the list through the cache. */
  onSaved: () => void;
}

/** The add / edit vendor form. */
export default function ContractorFormModal({ contractor, onClose, onSaved }: ContractorFormModalProps) {
  const editing = contractor !== null && contractor !== 'new' ? contractor : null;
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [createContractor] = useMutation(CreateContractorDocument);
  const [updateContractor] = useMutation(UpdateContractorDocument);

  useEffect(() => {
    if (contractor === null) return;
    setForm(editing ? formFrom(editing) : EMPTY_FORM);
    setError('');
  }, [contractor, editing]);

  function update(field: keyof typeof EMPTY_FORM, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fields = {
      categories: form.category ? [form.category as TradeCategory] : [],
      companyName: form.companyName || undefined,
      email: form.email || undefined,
      name: form.name,
      notes: form.notes || undefined,
      phone: form.phone || undefined,
      zipCodes: form.zipCodes.split(',').map((zipCode) => zipCode.trim()).filter(Boolean),
    };
    try {
      if (editing) {
        await updateContractor({ variables: { contractorId: editing.id, ...fields } });
      } else {
        await createContractor({ variables: fields });
        onSaved();
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose} open={contractor !== null} title={editing ? 'Edit Vendor' : 'Add Vendor'}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name">
            <Input onChange={(e) => update('name', e.target.value)} placeholder="John Smith" required value={form.name} />
          </Field>
          <Field label="Company">
            <Input onChange={(e) => update('companyName', e.target.value)} placeholder="Smith Decks" value={form.companyName} />
          </Field>
        </div>
        <Field label="Category">
          <Selector
            onChange={(category) => update('category', category)}
            options={TRADE_CATEGORY_OPTIONS}
            placeholder="Select a category"
            value={form.category}
          />
        </Field>
        <Field label="ZIP codes">
          <Input onChange={(e) => update('zipCodes', e.target.value)} placeholder="78701, 78702" value={form.zipCodes} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email">
            <Input onChange={(e) => update('email', e.target.value)} placeholder="john@company.com" type="email" value={form.email} />
          </Field>
          <Field label="Phone">
            <Input onChange={(e) => update('phone', e.target.value)} placeholder="5125551212" value={form.phone} />
          </Field>
        </div>
        <Field label="Notes">
          <Textarea onChange={(e) => update('notes', e.target.value)} placeholder="Recommended by neighbor..." rows={3} value={form.notes} />
        </Field>
        <div className="flex gap-3 justify-end">
          <Button onClick={onClose} variant="secondary">Cancel</Button>
          <Button disabled={saving} type="submit" variant="primary">
            {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Vendor'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
