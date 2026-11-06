'use client';
import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import GenerateConceptModal from './GenerateConceptModal';
import ImageGallery from './ImageGallery';
import PhotoUploadButton from './PhotoUploadButton';
import { JobImagesDocument } from './queries/__generated__/JobImages.generated';
import Alert from '@/components/ui/Alert';

/** The job's photos and AI concepts: upload photos, then generate concepts from them. */
export default function ImagesTab({ jobId }: { jobId: string }) {
  const { data, loading, refetch } = useQuery(JobImagesDocument, { variables: { jobIds: [jobId] } });
  const [generating, setGenerating] = useState(false);
  const images = data?.jobImages ?? [];
  const sourceImages = images.filter((image) => image.kind === 'SOURCE');
  const generatedImages = images.filter((image) => image.kind === 'GENERATED');

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-800">Photos &amp; AI Concepts</h3>
        <div className="flex gap-2">
          <Button
            className="text-sm"
            disabled={sourceImages.length === 0}
            onClick={() => setGenerating(true)}
            title={sourceImages.length === 0 ? 'Upload a photo first' : undefined}
            variant="secondary"
          >
            Generate AI Concept
          </Button>
          <PhotoUploadButton jobId={jobId} onUploaded={refetch} />
        </div>
      </div>

      <Alert className="mb-4 text-xs" tone="warning">
        AI-generated images are conceptual only and not construction-accurate.
      </Alert>

      {loading && !data ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : images.length === 0 ? (
        <EmptyState description="Upload photos of your space, then generate AI concepts." title="No images yet" />
      ) : (
        <div className="space-y-6">
          {sourceImages.length > 0 && (
            <ImageGallery fallbackAlt="Source photo" images={sourceImages} onDeleted={refetch} title="Source Photos" />
          )}
          {generatedImages.length > 0 && (
            <ImageGallery fallbackAlt="AI concept" images={generatedImages} title="AI Concepts" />
          )}
        </div>
      )}

      <GenerateConceptModal
        jobId={jobId}
        onClose={() => setGenerating(false)}
        onStarted={() => setTimeout(() => refetch(), 3000)}
        open={generating}
        sourceImages={sourceImages}
      />
    </div>
  );
}
