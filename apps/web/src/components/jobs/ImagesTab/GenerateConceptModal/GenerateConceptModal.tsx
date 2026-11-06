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
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import SubmitButton from '@/components/ui/SubmitButton';
import Textarea from '@/components/ui/Textarea';
import { requiredText } from '@/lib/formFields';
import type { JobImageRow } from '../types';
import { CreateAiGenerationDocument } from './mutations/__generated__/CreateAiGeneration.generated';

const schema = z.object({
  prompt: requiredText('Describe the change you want to see'),
  sourceImageId: z.string().min(1, 'Choose a source photo'),
});

const EMPTY = { prompt: '', sourceImageId: '' };

interface GenerateConceptModalProps {
  jobId: string;
  onClose: () => void;
  /** Called once the generation has been started; the image arrives a little later. */
  onStarted: () => void;
  open: boolean;
  sourceImages: JobImageRow[];
}

/** Starts an AI concept from one of the job's source photos and a prompt. */
export default function GenerateConceptModal({ jobId, onClose, onStarted, open, sourceImages }: GenerateConceptModalProps) {
  const [createAiGeneration] = useMutation(CreateAiGenerationDocument);
  const form = useForm({ defaultValues: EMPTY, resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) form.reset(EMPTY);
  }, [form, open]);

  async function handleSubmit(values: z.output<typeof schema>) {
    await createAiGeneration({ variables: { jobId, ...values, provider: 'openai' } });
    alert('AI generation started! Refresh in a moment to see the result.');
    onClose();
    onStarted();
  }

  return (
    <Modal onClose={onClose} open={open} title="Generate AI Concept">
      <Form form={form} onSubmit={handleSubmit}>
        <Field label="Source Photo" name="sourceImageId">
          <Select {...form.register('sourceImageId')}>
            <option value="">-- Select photo --</option>
            {sourceImages.map((image) => (
              <option key={image.id} value={image.id}>
                {image.label || image.id}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Prompt" name="prompt">
          <Textarea
            placeholder="Add a cedar deck in the back yard. Keep the house structure unchanged."
            rows={4}
            {...form.register('prompt')}
          />
        </Field>
        <p className="text-xs text-gray-400">Results are conceptual only. Generation may take 20–30 seconds.</p>
        <FormActions>
          <Button onClick={onClose} variant="secondary">Cancel</Button>
          <SubmitButton submittingText="Generating...">Generate</SubmitButton>
        </FormActions>
      </Form>
    </Modal>
  );
}
