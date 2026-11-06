'use client';
import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import Link from '@/components/ui/Link';
import { HomesDocument } from './queries/__generated__/Homes.generated';
import { CreateHomeDocument } from './mutations/__generated__/CreateHome.generated';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import Form from '@/components/ui/Form';
import FormActions from '@/components/ui/FormActions';
import Input from '@/components/ui/Input';
import SubmitButton from '@/components/ui/SubmitButton';
import Textarea from '@/components/ui/Textarea';
import PageHeader from '@/components/ui/PageHeader';
import { optionalText, requiredText, stateCode, zipCode } from '@/lib/formFields';

const schema = z.object({
  address1: requiredText('Enter the street address'),
  address2: optionalText,
  city: requiredText('Enter the city'),
  name: requiredText('Give the home a name'),
  notes: optionalText,
  state: stateCode,
  zipCode,
});

const EMPTY_HOME = { address1: '', address2: '', city: '', name: '', notes: '', state: '', zipCode: '' };

export default function HomesPage() {
  const { data, loading: fetching, refetch } = useQuery(HomesDocument);
  const homesList = data?.homes ?? [];
  const loading = fetching && !data;
  const [createHome] = useMutation(CreateHomeDocument);
  const [showCreate, setShowCreate] = useState(false);
  const form = useForm({ defaultValues: EMPTY_HOME, resolver: zodResolver(schema) });

  function openCreate() {
    form.reset(EMPTY_HOME);
    setShowCreate(true);
  }

  async function handleCreate(values: z.output<typeof schema>) {
    await createHome({ variables: values });
    await refetch();
    setShowCreate(false);
  }

  return (
    <div>
      <PageHeader
        actions={
          <Button onClick={() => openCreate()} variant="primary">
            + Add Home
          </Button>
        }
        title="My Homes"
      />

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : homesList.length === 0 ? (
        <EmptyState
          title="No homes yet"
          description="Add your first home to start managing projects."
          action={
            <Button variant="primary" onClick={() => openCreate()}>
              Add Home
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {homesList.map((home) => (
            <Link
              variant="card"
              key={home.id}
              href={`/homes/${home.id}`}
              className="p-5"
            >
              <h2 className="font-semibold text-gray-900">{home.name}</h2>
              <p className="text-sm text-gray-500 mt-1">{home.fullAddress}</p>
              {home.notes && (
                <p className="text-xs text-gray-400 mt-2 line-clamp-2">{home.notes}</p>
              )}
            </Link>
          ))}
        </div>
      )}

      <Modal title="Add Home" open={showCreate} onClose={() => setShowCreate(false)}>
        <Form form={form} onSubmit={handleCreate}>
          <Field label="Home Name" name="name">
            <Input placeholder="Primary Residence" {...form.register('name')} />
          </Field>
          <Field label="Address Line 1" name="address1">
            <Input placeholder="123 Main St" {...form.register('address1')} />
          </Field>
          <Field label="Address Line 2" name="address2">
            <Input placeholder="Apt 2 (optional)" {...form.register('address2')} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field className="col-span-1" label="City" name="city">
              <Input placeholder="Austin" {...form.register('city')} />
            </Field>
            <Field label="State" name="state">
              <Input className="uppercase" maxLength={2} placeholder="TX" {...form.register('state')} />
            </Field>
            <Field label="ZIP" name="zipCode">
              <Input placeholder="78745" {...form.register('zipCode')} />
            </Field>
          </div>
          <Field label="Notes" name="notes">
            <Textarea placeholder="Any notes about this property..." rows={3} {...form.register('notes')} />
          </Field>
          <FormActions className="pt-2">
            <Button onClick={() => setShowCreate(false)} variant="secondary">
              Cancel
            </Button>
            <SubmitButton submittingText="Saving...">Create Home</SubmitButton>
          </FormActions>
        </Form>
      </Modal>
    </div>
  );
}
