'use client';
import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import Link from '@/components/ui/Link';
import { useMutation, useQuery } from '@apollo/client/react';
import { TradeCategory } from '@/graphql/types.generated';
import { TRADE_CATEGORY_OPTIONS, tradeCategoryLabel } from '@/lib/tradeCategories';
import { optionalEmail, optionalText, requiredText, zipCode } from '@/lib/formFields';
import { UserContractorsDocument } from './queries/__generated__/UserContractors.generated';
import { CreateUserContractorDocument } from './mutations/__generated__/CreateUserContractor.generated';
import { DeleteUserContractorDocument } from './mutations/__generated__/DeleteUserContractor.generated';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import Form from '@/components/ui/Form';
import FormActions from '@/components/ui/FormActions';
import FormSelector from '@/components/ui/FormSelector';
import SubmitButton from '@/components/ui/SubmitButton';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import PageHeader from '@/components/ui/PageHeader';

const schema = z.object({
  category: z.string(),
  companyName: optionalText,
  email: optionalEmail,
  name: requiredText('Enter a name'),
  note: optionalText,
  notes: optionalText,
  phone: optionalText,
  zipCode: z.union([z.literal(''), zipCode]),
});

const EMPTY_CONTRACTOR = { category: '', companyName: '', email: '', name: '', note: '', notes: '', phone: '', zipCode: '' };

export default function MyRolodexPage() {
  const { data, loading: fetching, refetch } = useQuery(UserContractorsDocument);
  const entries = data?.userContractors ?? [];
  const loading = fetching && !data;
  const [createUserContractor] = useMutation(CreateUserContractorDocument);
  const [deleteUserContractor] = useMutation(DeleteUserContractorDocument);
  const [showCreate, setShowCreate] = useState(false);
  const form = useForm({ defaultValues: EMPTY_CONTRACTOR, resolver: zodResolver(schema) });

  function openCreate() {
    form.reset(EMPTY_CONTRACTOR);
    setShowCreate(true);
  }

  async function handleSubmit({ category, zipCode: zip, ...fields }: z.output<typeof schema>) {
    await createUserContractor({
      variables: {
        ...fields,
        categories: category ? [category as TradeCategory] : undefined,
        zipCodes: zip ? [zip] : undefined,
      },
    });
    await refetch();
    setShowCreate(false);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove ${name} from your rolodex?`)) return;
    try {
      await deleteUserContractor({ variables: { userContractorId: id } });
      await refetch();
    } catch {}
  }

  return (
    <div>
      <PageHeader
        actions={
          <>
            <Link href="/contractors" variant="secondary">Global Contractors</Link>
            <Button onClick={openCreate} variant="primary">+ Add Contractor</Button>
          </>
        }
        subtitle="Your personal contractor list — global and private."
        title="My Rolodex"
      />

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : entries.length === 0 ? (
        <EmptyState
          title="No contractors saved"
          description="Add a contractor manually or save one from the global list."
          action={<Button variant="primary" onClick={openCreate}>Add Contractor</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {entries.map((entry) => {
            const c = entry.contractor;
            return (
              <Card key={entry.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-gray-900">{c.name}</h2>
                      {c.isGlobal && <Badge>Global</Badge>}
                    </div>
                    {c.companyName && <p className="text-sm text-gray-500 mt-1">{c.companyName}</p>}
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => handleDelete(entry.id, c.name)}>
                    Remove
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {c.categories.map((value) => (
                    <span key={value} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
                      {tradeCategoryLabel(value)}
                    </span>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <div>{c.email || '—'}</div>
                  <div>{c.phone || '—'}</div>
                  {c.zipCodes.length > 0 && (
                    <div className="col-span-2">ZIP: {c.zipCodes.join(', ')}</div>
                  )}
                </div>
                {entry.note && (
                  <p className="mt-3 text-sm text-gray-500 italic">&ldquo;{entry.note}&rdquo;</p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal title="Add Contractor" open={showCreate} onClose={() => setShowCreate(false)}>
        <Form form={form} onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name" name="name">
              <Input placeholder="John Smith" {...form.register('name')} />
            </Field>
            <Field label="Company" name="companyName">
              <Input placeholder="Smith Plumbing" {...form.register('companyName')} />
            </Field>
          </div>
          <Field label="Category" name="category">
            <FormSelector name="category" options={TRADE_CATEGORY_OPTIONS} placeholder="Select a category" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email" name="email">
              <Input placeholder="john@company.com" type="email" {...form.register('email')} />
            </Field>
            <Field label="Phone" name="phone">
              <Input placeholder="5125551212" {...form.register('phone')} />
            </Field>
          </div>
          <Field label="ZIP Code" name="zipCode">
            <Input placeholder="78701" {...form.register('zipCode')} />
          </Field>
          <Field label="Contractor notes" name="notes">
            <Textarea placeholder="Background info on this contractor..." rows={2} {...form.register('notes')} />
          </Field>
          <Field label="Your personal note" name="note">
            <Textarea placeholder="Met at the trade show, great for HVAC..." rows={2} {...form.register('note')} />
          </Field>
          <FormActions>
            <Button onClick={() => setShowCreate(false)} variant="secondary">Cancel</Button>
            <SubmitButton submittingText="Saving...">Add Contractor</SubmitButton>
          </FormActions>
        </Form>
      </Modal>
    </div>
  );
}
