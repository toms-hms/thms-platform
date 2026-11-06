'use client';
import { useEffect } from 'react';
import { useMutation } from '@apollo/client/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import Form from '@/components/ui/Form';
import FormActions from '@/components/ui/FormActions';
import FormSelector from '@/components/ui/FormSelector';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import SubmitButton from '@/components/ui/SubmitButton';
import Textarea from '@/components/ui/Textarea';
import type { TradeCategory } from '@/graphql/types.generated';
import { clearableEmail, clearableText, requiredText, zipCodeList } from '@/lib/formFields';
import { TRADE_CATEGORY_OPTIONS } from '@/lib/tradeCategories';
import type { Contractor } from '../types';
import { CreateContractorDocument } from './mutations/__generated__/CreateContractor.generated';
import { UpdateContractorDocument } from './mutations/__generated__/UpdateContractor.generated';

const schema = z.object({
  category: z.string(),
  companyName: clearableText,
  email: clearableEmail,
  name: requiredText('Enter a name'),
  notes: clearableText,
  phone: clearableText,
  zipCodes: zipCodeList,
});

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
  const form = useForm({ defaultValues: EMPTY_FORM, resolver: zodResolver(schema) });
  const [createContractor] = useMutation(CreateContractorDocument);
  const [updateContractor] = useMutation(UpdateContractorDocument);

  useEffect(() => {
    if (contractor === null) return;
    form.reset(editing ? formFrom(editing) : EMPTY_FORM);
  }, [contractor, editing, form]);

  async function handleSubmit({ category, ...fields }: z.output<typeof schema>) {
    const values = { ...fields, categories: category ? [category as TradeCategory] : [] };
    if (editing) {
      await updateContractor({ variables: { contractorId: editing.id, ...values } });
    } else {
      await createContractor({ variables: values });
      onSaved();
    }
    onClose();
  }

  return (
    <Modal onClose={onClose} open={contractor !== null} title={editing ? 'Edit Vendor' : 'Add Vendor'}>
      <Form form={form} onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name" name="name">
            <Input placeholder="John Smith" {...form.register('name')} />
          </Field>
          <Field label="Company" name="companyName">
            <Input placeholder="Smith Decks" {...form.register('companyName')} />
          </Field>
        </div>
        <Field label="Category" name="category">
          <FormSelector name="category" options={TRADE_CATEGORY_OPTIONS} placeholder="Select a category" />
        </Field>
        <Field label="ZIP codes" name="zipCodes">
          <Input placeholder="78701, 78702" {...form.register('zipCodes')} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email" name="email">
            <Input placeholder="john@company.com" type="email" {...form.register('email')} />
          </Field>
          <Field label="Phone" name="phone">
            <Input placeholder="5125551212" {...form.register('phone')} />
          </Field>
        </div>
        <Field label="Notes" name="notes">
          <Textarea placeholder="Recommended by neighbor..." rows={3} {...form.register('notes')} />
        </Field>
        <FormActions>
          <Button onClick={onClose} variant="secondary">Cancel</Button>
          <SubmitButton submittingText="Saving...">{editing ? 'Save Changes' : 'Add Vendor'}</SubmitButton>
        </FormActions>
      </Form>
    </Modal>
  );
}
