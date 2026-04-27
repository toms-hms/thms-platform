import { useRef, useState } from 'react';
import { JobIntent, TradeCategory } from '@thms/shared';
import { CATEGORY_CONFIG } from './categoryConfig';

interface Props {
  intent: JobIntent;
  category: TradeCategory;
  title: string;
  description: string;
  photos: File[];
  onUpdate: (fields: { title?: string; description?: string; photos?: File[] }) => void;
  onNext: () => void;
  onBack: () => void;
  submitting: boolean;
  error: string;
}

export default function Step3Describe({
  intent, category, title, description, photos,
  onUpdate, onNext, onBack, submitting, error,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const categoryLabel = CATEGORY_CONFIG[intent].find(t => t.tradeCategory === category)?.label ?? category;

  function addFiles(files: FileList | null) {
    if (!files) return;
    const existing = photos.map(f => f.name);
    const newFiles = Array.from(files)
      .filter(f => f.type.startsWith('image/') && !existing.includes(f.name))
      .slice(0, 8 - photos.length);
    if (newFiles.length) onUpdate({ photos: [...photos, ...newFiles] });
  }

  function removePhoto(index: number) {
    onUpdate({ photos: photos.filter((_, i) => i !== index) });
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full">
          {categoryLabel}
        </span>
      </div>
      <h2 className="text-2xl font-bold text-ink mb-2 mt-2">Describe the work</h2>
      <p className="text-gray-500 mb-8">The more detail you provide, the better contractors can quote without a site visit.</p>

      <div className="space-y-6 max-w-2xl">
        <div>
          <label className="label">Title <span className="text-red-500">*</span></label>
          <input
            className="input"
            value={title}
            onChange={e => onUpdate({ title: e.target.value })}
            placeholder="e.g. Fix leaking kitchen faucet"
            maxLength={100}
          />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            className="input"
            rows={4}
            value={description}
            onChange={e => onUpdate({ description: e.target.value })}
            placeholder="Describe what's happening, when it started, any relevant details..."
          />
        </div>

        <div>
          <label className="label">
            Photos
            <span className="text-gray-400 font-normal ml-1">({photos.length}/8) — strongly recommended</span>
          </label>

          {photos.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
              {photos.map((file, i) => (
                <div key={i} className="relative group aspect-square">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-full object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {photos.length < 8 && (
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                dragOver ? 'border-brand-400 bg-brand-50' : 'border-gray-200 hover:border-brand-300 hover:bg-gray-50'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
            >
              <div className="text-3xl mb-2">📷</div>
              <p className="text-sm font-medium text-gray-600">Drop photos here or click to browse</p>
              <p className="text-xs text-gray-400 mt-1">JPEG, PNG, HEIC up to 20 MB each</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => addFiles(e.target.files)}
              />
            </div>
          )}
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">
            ← Back
          </button>
          <button
            onClick={onNext}
            disabled={!title.trim() || submitting}
            className="btn-primary min-w-[120px]"
          >
            {submitting ? 'Saving...' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}
