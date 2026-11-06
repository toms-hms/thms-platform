'use client';
import { useMutation } from '@apollo/client/react';
import Button from '@/components/ui/Button';
import type { JobImageRow } from '../types';
import { DeleteJobImageDocument } from './mutations/__generated__/DeleteJobImage.generated';

interface ImageGalleryProps {
  /** Alt text for an image with no label. */
  fallbackAlt: string;
  images: JobImageRow[];
  /** When given, each image gets a delete button, and this runs after a delete. */
  onDeleted?: () => void;
  title: string;
}

/** A titled grid of job images, optionally deletable. */
export default function ImageGallery({ fallbackAlt, images, onDeleted, title }: ImageGalleryProps) {
  const [deleteJobImage] = useMutation(DeleteJobImageDocument);

  async function handleDelete(imageId: string) {
    if (!confirm('Delete this image?')) return;
    try {
      await deleteJobImage({ variables: { imageId } });
      onDeleted?.();
    } catch {}
  }

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-700 mb-3">{title}</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {images.map((image) => (
          <div className="relative group" key={image.id}>
            {/* eslint-disable-next-line @next/next/no-img-element -- presigned storage URLs, not optimisable by next/image */}
            <img alt={image.label || fallbackAlt} className="w-full h-40 object-cover rounded-lg" src={image.url} />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg" />
            {onDeleted && (
              <Button
                className="absolute top-2 right-2 bg-white rounded-full w-6 h-6 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-xs flex items-center justify-center"
                onClick={() => handleDelete(image.id)}
                variant="bare"
              >
                ✕
              </Button>
            )}
            {image.label && <p className="text-xs text-gray-500 mt-1 truncate">{image.label}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
