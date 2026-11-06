'use client';
import { useState, type FormEvent } from 'react';
import { useMutation } from '@apollo/client/react';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import type { JobImageRow } from '../types';
import { CreateAiGenerationDocument } from './mutations/__generated__/CreateAiGeneration.generated';

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
  const [form, setForm] = useState({ prompt: '', sourceImageId: '' });
  const [generating, setGenerating] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setGenerating(true);
    try {
      await createAiGeneration({
        variables: { jobId, sourceImageId: form.sourceImageId, prompt: form.prompt, provider: 'openai' },
      });
      alert('AI generation started! Refresh in a moment to see the result.');
      onClose();
      onStarted();
    } catch (err: any) {
      alert(err.message || 'Generation failed');
    }
    setGenerating(false);
  }

  return (
    <Modal onClose={onClose} open={open} title="Generate AI Concept">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field label="Source Photo">
          <Select onChange={(e) => setForm((f) => ({ ...f, sourceImageId: e.target.value }))} required value={form.sourceImageId}>
            <option value="">-- Select photo --</option>
            {sourceImages.map((image) => (
              <option key={image.id} value={image.id}>
                {image.label || image.id}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Prompt">
          <Textarea
            onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
            placeholder="Add a cedar deck in the back yard. Keep the house structure unchanged."
            required
            rows={4}
            value={form.prompt}
          />
        </Field>
        <p className="text-xs text-gray-400">Results are conceptual only. Generation may take 20–30 seconds.</p>
        <div className="flex gap-3 justify-end">
          <Button onClick={onClose} variant="secondary">Cancel</Button>
          <Button disabled={generating} type="submit" variant="primary">
            {generating ? 'Generating...' : 'Generate'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
