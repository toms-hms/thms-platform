import { skipToken, useQuery } from '@apollo/client/react';
import { JobIntent, TradeCategory } from '@/graphql/types.generated';
import { WizardContractorsDocument } from './queries/__generated__/WizardContractors.generated';
import { CATEGORY_CONFIG } from '../categoryConfig';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';

interface Props {
  categories: TradeCategory[];
  zipCodes: string[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  submitting: boolean;
  error: string;
}

export default function Step5Contractors({
  categories, zipCodes, selectedIds, onToggle, onSubmit, onBack, submitting, error,
}: Props) {
  const categoryLabels = categories.map(cat =>
    CATEGORY_CONFIG[JobIntent.ISSUE].find(t => t.tradeCategory === cat)?.label ?? cat
  );

  const canSearch = categories.length > 0 && zipCodes.length > 0;
  const { data, loading: fetching } = useQuery(
    WizardContractorsDocument,
    canSearch ? { variables: { tradeCategories: categories, zipCodes } } : skipToken
  );
  const contractors = data?.contractors ?? [];
  const loading = canSearch && fetching && !data;

  const MAX = 3;
  const canSelect = (id: string) => selectedIds.includes(id) || selectedIds.length < MAX;

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-ink mb-2">Pick your contractors</h2>
      <p className="text-gray-500 mb-2">
        Select up to {MAX} contractors to receive quotes for:{' '}
        <span className="font-medium text-gray-700">{categoryLabels.join(', ')}</span>.
      </p>
      <p className="text-xs text-gray-400 mb-8">
        Each contractor receives a separate message — they won&apos;t see each other.
      </p>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading contractors...</div>
      ) : contractors.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-200">
          <div className="text-4xl mb-3">🔍</div>
          <p className="font-medium text-gray-700 mb-1">No contractors yet for this category</p>
          <p className="text-sm text-gray-400">Ask an admin to add contractors, then come back.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {contractors.map((c) => {
            const selected = selectedIds.includes(c.id);
            const disabled = !canSelect(c.id);
            return (
              <Button
                variant="bare"
                key={c.id}
                onClick={() => !disabled && onToggle(c.id)}
                disabled={disabled}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
                  selected ? 'border-brand-500 bg-brand-50'
                    : disabled ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                    : 'border-gray-100 bg-white hover:border-brand-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selected ? 'border-brand-500 bg-brand-500' : 'border-gray-300'}`}>
                    {selected && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink text-sm">{c.name}</span>
                      {c.companyName && <span className="text-xs text-gray-400">· {c.companyName}</span>}
                    </div>
                    <div className="flex gap-3 mt-0.5 text-xs text-gray-400">
                      {c.email && <span>{c.email}</span>}
                      {c.phone && <span>{c.phone}</span>}
                    </div>
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
      )}

      {selectedIds.length > 0 && (
        <p className="mt-4 text-sm text-brand-700 font-medium">{selectedIds.length} of {MAX} selected</p>
      )}

      {error && (
        <Alert className="mt-4" tone="error">{error}</Alert>
      )}

      <div className="flex items-center justify-between mt-8">
        <Button variant="muted" onClick={onBack}>← Back</Button>
        <Button
          variant="primary"
          onClick={onSubmit}
          disabled={selectedIds.length === 0 || submitting}
          className="min-w-[160px]"
        >
          {submitting ? 'Sending...' : selectedIds.length > 0 ? `Ask ${selectedIds.length} for quotes →` : 'Select contractors'}
        </Button>
      </div>
    </div>
  );
}
