'use client';
import { useEffect } from 'react';
import { useMutation } from '@apollo/client/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { BADGE_CLASSES } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import Form from '@/components/ui/Form';
import FormActions from '@/components/ui/FormActions';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import SubmitButton from '@/components/ui/SubmitButton';
import Textarea from '@/components/ui/Textarea';
import { TradeCategory } from '@/graphql/types.generated';
import { cn } from '@/lib/cn';
import { clearableEmail, clearableText, requiredText } from '@/lib/formFields';
import { TRADE_CATEGORY_LABELS } from '@/lib/tradeCategories';
import type { ContractorDetail } from '../types';
import { UpdateContractorDetailsDocument } from './mutations/__generated__/UpdateContractorDetails.generated';

const schema = z.object({
  categories: z.array(z.enum(TradeCategory)),
  companyName: clearableText,
  email: clearableEmail,
  name: requiredText('Enter a name'),
  notes: clearableText,
  phone: clearableText,
});

function formFrom(contractor: ContractorDetail): z.input<typeof schema> {
  return {
    categories: contractor.categories as TradeCategory[],
    companyName: contractor.companyName || '',
    email: contractor.email || '',
    name: contractor.name,
    notes: contractor.notes || '',
    phone: contractor.phone || '',
  };
}

interface ContractorEditModalProps {
  contractor: ContractorDetail;
  onClose: () => void;
  open: boolean;
}

/** The admin edit form. Saving updates the page through Apollo's cache. */
export default function ContractorEditModal({ contractor, onClose, open }: ContractorEditModalProps) {
  const form = useForm({ defaultValues: formFrom(contractor), resolver: zodResolver(schema) });
  const [updateContractor] = useMutation(UpdateContractorDetailsDocument);

  useEffect(() => {
    if (open) form.reset(formFrom(contractor));
  }, [contractor, form, open]);

  async function handleSubmit(values: z.output<typeof schema>) {
    await updateContractor({ variables: { contractorId: contractor.id, ...values, zipCodes: contractor.zipCodes } });
    onClose();
  }

  return (
    <Modal onClose={onClose} open={open} title="Edit Contractor">
      <Form form={form} onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name" name="name">
            <Input {...form.register('name')} />
          </Field>
          <Field label="Company" name="companyName">
            <Input {...form.register('companyName')} />
          </Field>
        </div>
        <Field label="Categories" name="categories">
          <Controller
            control={form.control}
            name="categories"
            render={({ field }) => (
              <div className="flex flex-wrap gap-2 mt-1">
                {Object.values(TradeCategory).map((category) => {
                  const selected = field.value.includes(category);
                  return (
                    <Button
                      className={cn(
                        BADGE_CLASSES,
                        'cursor-pointer transition-colors',
                        selected ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      )}
                      key={category}
                      onClick={() =>
                        field.onChange(selected ? field.value.filter((c) => c !== category) : [...field.value, category])
                      }
                      variant="bare"
                    >
                      {TRADE_CATEGORY_LABELS[category]}
                    </Button>
                  );
                })}
              </div>
            )}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email" name="email">
            <Input type="email" {...form.register('email')} />
          </Field>
          <Field label="Phone" name="phone">
            <Input {...form.register('phone')} />
          </Field>
        </div>
        <Field label="Notes" name="notes">
          <Textarea rows={3} {...form.register('notes')} />
        </Field>
        <FormActions>
          <Button onClick={onClose} variant="secondary">Cancel</Button>
          <SubmitButton submittingText="Saving...">Save Changes</SubmitButton>
        </FormActions>
      </Form>
    </Modal>
  );
}
