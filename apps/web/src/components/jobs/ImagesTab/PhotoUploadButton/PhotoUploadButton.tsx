'use client';
import { useRef, useState, type ChangeEvent } from 'react';
import { useMutation } from '@apollo/client/react';
import { buttonVariants } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { cn } from '@/lib/cn';
import { CreateJobImageDocument } from './mutations/__generated__/CreateJobImage.generated';
import { RequestUploadUrlDocument } from './mutations/__generated__/RequestUploadUrl.generated';

interface PhotoUploadButtonProps {
  jobId: string;
  onUploaded: () => void;
}

/** Uploads one photo: a presigned URL from the API, a direct PUT to storage, then the image row. */
export default function PhotoUploadButton({ jobId, onUploaded }: PhotoUploadButtonProps) {
  const [requestUploadUrl] = useMutation(RequestUploadUrlDocument);
  const [createJobImage] = useMutation(CreateJobImageDocument);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data } = await requestUploadUrl({
        variables: { jobId, contentType: file.type, fileName: file.name, kind: 'SOURCE' },
      });
      const upload = data?.requestUploadUrl?.upload;
      if (!upload) throw new Error('Upload failed');
      await fetch(upload.uploadUrl, { body: file, headers: { 'Content-Type': file.type }, method: 'PUT' });
      await createJobImage({ variables: { jobId, key: upload.key, kind: 'SOURCE', label: file.name } });
      onUploaded();
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    // eslint-disable-next-line react/forbid-elements -- a <label> wrapping the hidden file input is what opens the picker
    <label className={cn(buttonVariants({ variant: 'primary' }), 'text-sm cursor-pointer')}>
      {uploading ? 'Uploading...' : 'Upload Photo'}
      <Input accept="image/*" className="hidden" disabled={uploading} onChange={handleUpload} ref={fileInputRef} type="file" />
    </label>
  );
}
