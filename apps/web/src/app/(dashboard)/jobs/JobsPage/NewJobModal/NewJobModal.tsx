'use client';
import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import Form from '@/components/ui/Form';
import FormActions from '@/components/ui/FormActions';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import SubmitButton from '@/components/ui/SubmitButton';
import { requiredText, stateCode, zipCode } from '@/lib/formFields';
import { JobsCreateHomeDocument } from './mutations/__generated__/JobsCreateHome.generated';
import { JobsHomesDocument } from './queries/__generated__/JobsHomes.generated';

const schema = z.object({
  address1: requiredText('Enter the street address'),
  city: requiredText('Enter the city'),
  name: requiredText('Give the home a name'),
  state: stateCode,
  zipCode,
});

const EMPTY_HOME = { address1: '', city: '', name: '', state: '', zipCode: '' };

interface NewJobModalProps {
  onClose: () => void;
  open: boolean;
}

/** Starts a new job: pick which home it's for, or add a home first. Either way, opens the job wizard. */
export default function NewJobModal({ onClose, open }: NewJobModalProps) {
  const router = useRouter();
  const { data } = useQuery(JobsHomesDocument);
  const homes = data?.homes ?? [];
  const [createHome] = useMutation(JobsCreateHomeDocument);
  const [step, setStep] = useState<'pick' | 'add'>('pick');
  const form = useForm({ defaultValues: EMPTY_HOME, resolver: zodResolver(schema) });

  useEffect(() => {
    if (!open) return;
    setStep('pick');
    form.reset(EMPTY_HOME);
  }, [form, open]);

  function startJob(homeId: string) {
    onClose();
    router.push(`/homes/${homeId}/jobs/new`);
  }

  async function handleCreateHome(values: z.output<typeof schema>) {
    const { data: created } = await createHome({ variables: { ...values, country: 'US' } });
    const home = created?.createHome?.home;
    if (!home) throw new Error('Failed to create home');
    startJob(home.id);
  }

  return (
    <Modal onClose={onClose} open={open} title={step === 'pick' ? 'Select a home' : 'Add a home'}>
      {step === 'pick' ? (
        <div>
          <p className="text-sm text-gray-500 mb-4">Choose which home this job is for.</p>
          {homes.length > 0 && (
            <div className="space-y-2 mb-3">
              {homes.map((home) => (
                <Button
                  className="w-full text-left p-4 rounded-xl border-2 border-gray-100 hover:border-brand-400 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                  key={home.id}
                  onClick={() => startJob(home.id)}
                  variant="bare"
                >
                  <div className="font-semibold text-ink text-sm">{home.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{home.fullAddress}</div>
                </Button>
              ))}
            </div>
          )}
          <Button
            className="w-full p-4 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-500 hover:border-brand-400 hover:text-brand-700 transition-all text-center"
            onClick={() => setStep('add')}
            variant="bare"
          >
            + Add a new home
          </Button>
        </div>
      ) : (
        <Form form={form} onSubmit={handleCreateHome}>
          <p className="text-sm text-gray-500">Fill in the basics — you can add more detail later.</p>
          <Field label="Home name" name="name">
            <Input placeholder="Main Residence" {...form.register('name')} />
          </Field>
          <Field label="Street address" name="address1">
            <Input placeholder="123 Maple St" {...form.register('address1')} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="City" name="city">
              <Input placeholder="Austin" {...form.register('city')} />
            </Field>
            <Field label="State" name="state">
              <Input className="uppercase" maxLength={2} placeholder="TX" {...form.register('state')} />
            </Field>
            <Field label="ZIP" name="zipCode">
              <Input placeholder="78701" {...form.register('zipCode')} />
            </Field>
          </div>
          <FormActions className="justify-between pt-2">
            <Button onClick={() => setStep('pick')} variant="muted">
              ← Back
            </Button>
            <SubmitButton submittingText="Creating...">Create &amp; continue →</SubmitButton>
          </FormActions>
        </Form>
      )}
    </Modal>
  );
}
