'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { JobsCreateHomeDocument } from './mutations/__generated__/JobsCreateHome.generated';
import { JobsHomesDocument } from './queries/__generated__/JobsHomes.generated';

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
  const [form, setForm] = useState(EMPTY_HOME);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setStep('pick');
    setForm(EMPTY_HOME);
    setError('');
  }, [open]);

  function startJob(homeId: string) {
    onClose();
    router.push(`/homes/${homeId}/jobs/new`);
  }

  async function handleCreateHome(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { data: created } = await createHome({ variables: { ...form, country: 'US' } });
      const home = created?.createHome?.home;
      if (!home) throw new Error('Failed to create home');
      startJob(home.id);
    } catch (err: any) {
      setError(err.message || 'Failed to create home');
    } finally {
      setSaving(false);
    }
  }

  function update(field: keyof typeof EMPTY_HOME, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
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
            onClick={() => { setStep('add'); setError(''); }}
            variant="bare"
          >
            + Add a new home
          </Button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleCreateHome}>
          <p className="text-sm text-gray-500">Fill in the basics — you can add more detail later.</p>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
          )}
          <Field label="Home name">
            <Input onChange={(e) => update('name', e.target.value)} placeholder="Main Residence" required value={form.name} />
          </Field>
          <Field label="Street address">
            <Input onChange={(e) => update('address1', e.target.value)} placeholder="123 Maple St" required value={form.address1} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="City">
              <Input onChange={(e) => update('city', e.target.value)} placeholder="Austin" required value={form.city} />
            </Field>
            <Field label="State">
              <Input maxLength={2} onChange={(e) => update('state', e.target.value.toUpperCase())} placeholder="TX" required value={form.state} />
            </Field>
            <Field label="ZIP">
              <Input onChange={(e) => update('zipCode', e.target.value)} placeholder="78701" required value={form.zipCode} />
            </Field>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button onClick={() => setStep('pick')} variant="muted">
              ← Back
            </Button>
            <Button className="ml-auto" disabled={saving} type="submit" variant="primary">
              {saving ? 'Creating...' : 'Create & continue →'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
