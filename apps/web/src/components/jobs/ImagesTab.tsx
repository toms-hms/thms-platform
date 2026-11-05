'use client';
import { useState, useRef, FormEvent } from 'react';
import Image from 'next/image';
import { useMutation, useQuery } from '@apollo/client/react';
import { JobImagesDocument } from './queries/__generated__/JobImages.generated';
import { RequestUploadUrlDocument } from './mutations/__generated__/RequestUploadUrl.generated';
import { CreateJobImageDocument } from './mutations/__generated__/CreateJobImage.generated';
import { DeleteJobImageDocument } from './mutations/__generated__/DeleteJobImage.generated';
import { CreateAiGenerationDocument } from './mutations/__generated__/CreateAiGeneration.generated';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { buttonVariants } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

interface Props {
  jobId: string;
}

export default function ImagesTab({ jobId }: Props) {
  const { data, loading: fetching, refetch } = useQuery(JobImagesDocument, { variables: { jobIds: [jobId] } });
  const imagesList = data?.jobImages ?? [];
  const loading = fetching && !data;
  const [requestUploadUrl] = useMutation(RequestUploadUrlDocument);
  const [createJobImage] = useMutation(CreateJobImageDocument);
  const [deleteJobImage] = useMutation(DeleteJobImageDocument);
  const [createAiGeneration] = useMutation(CreateAiGenerationDocument);
  const [uploading, setUploading] = useState(false);
  const [showAIGen, setShowAIGen] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [genForm, setGenForm] = useState({ sourceImageId: '', prompt: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data: urlData } = await requestUploadUrl({ variables: {
        jobId,
        fileName:    file.name,
        contentType: file.type,
        kind:        'SOURCE',
      } });
      const upload = urlData?.requestUploadUrl?.upload;
      if (!upload) throw new Error('Upload failed');
      const { uploadUrl, key } = upload;

      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      await createJobImage({ variables: {
        jobId,
        key,
        kind:  'SOURCE',
        label: file.name,
      } });
      await refetch();
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleGenerate(e: FormEvent) {
    e.preventDefault();
    setGenLoading(true);
    try {
      await createAiGeneration({ variables: {
        jobId,
        sourceImageId: genForm.sourceImageId,
        prompt:        genForm.prompt,
        provider:      'openai',
      } });
      alert('AI generation started! Refresh in a moment to see the result.');
      setShowAIGen(false);
      setTimeout(() => refetch(), 3000);
    } catch (err: any) {
      alert(err.message || 'Generation failed');
    }
    setGenLoading(false);
  }

  async function handleDelete(imageId: string) {
    if (!confirm('Delete this image?')) return;
    try {
      await deleteJobImage({ variables: { imageId } });
      await refetch();
    } catch {}
  }

  const sourceImages = imagesList.filter((i) => i.kind === 'SOURCE');
  const generatedImages = imagesList.filter((i) => i.kind === 'GENERATED');

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-800">Photos &amp; AI Concepts</h3>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setShowAIGen(true)}
            disabled={sourceImages.length === 0}
            className="text-sm"
            title={sourceImages.length === 0 ? 'Upload a photo first' : undefined}
          >
            Generate AI Concept
          </Button>
          {/* eslint-disable-next-line react/forbid-elements -- a <label> wrapping the hidden file input is what opens the picker */}
          <label className={cn(buttonVariants({ variant: 'primary' }), 'text-sm cursor-pointer')}>
            {uploading ? 'Uploading...' : 'Upload Photo'}
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-4">
        AI-generated images are conceptual only and not construction-accurate.
      </p>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : imagesList.length === 0 ? (
        <EmptyState
          title="No images yet"
          description="Upload photos of your space, then generate AI concepts."
        />
      ) : (
        <div className="space-y-6">
          {sourceImages.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Source Photos</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {sourceImages.map((img) => (
                  <div key={img.id} className="relative group">
                    <img
                      src={img.url}
                      alt={img.label || 'Source photo'}
                      className="w-full h-40 object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg" />
                    <Button
                      variant="bare"
                      onClick={() => handleDelete(img.id)}
                      className="absolute top-2 right-2 bg-white rounded-full w-6 h-6 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-xs flex items-center justify-center"
                    >
                      ✕
                    </Button>
                    {img.label && (
                      <p className="text-xs text-gray-500 mt-1 truncate">{img.label}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {generatedImages.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">AI Concepts</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {generatedImages.map((img) => (
                  <div key={img.id} className="relative group">
                    <img
                      src={img.url}
                      alt={img.label || 'AI concept'}
                      className="w-full h-40 object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg" />
                    {img.label && (
                      <p className="text-xs text-gray-500 mt-1 truncate">{img.label}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal title="Generate AI Concept" open={showAIGen} onClose={() => setShowAIGen(false)}>
        <form onSubmit={handleGenerate} className="space-y-4">
          <Field label="Source Photo">
            <Select
              value={genForm.sourceImageId}
              onChange={(e) => setGenForm((f) => ({ ...f, sourceImageId: e.target.value }))}
              required
            >
              <option value="">-- Select photo --</option>
              {sourceImages.map((img) => (
                <option key={img.id} value={img.id}>
                  {img.label || img.id}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Prompt">
            <Textarea
              rows={4}
              value={genForm.prompt}
              onChange={(e) => setGenForm((f) => ({ ...f, prompt: e.target.value }))}
              placeholder="Add a cedar deck in the back yard. Keep the house structure unchanged."
              required
            />
          </Field>
          <p className="text-xs text-gray-400">
            Results are conceptual only. Generation may take 20–30 seconds.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowAIGen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={genLoading}>
              {genLoading ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
