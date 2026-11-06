import Button from '@/components/ui/Button';
import { JobIntent, TradeCategory } from '@/graphql/types.generated';
import { CATEGORY_CONFIG } from '../../categoryConfig';
import type { CategorySuggestion } from '../types';

function categoryLabel(category: TradeCategory) {
  return CATEGORY_CONFIG[JobIntent.ISSUE].find((t) => t.tradeCategory === category)?.label ?? category;
}

interface CategorySuggestionsProps {
  confirmed: CategorySuggestion[];
  onToggle: (suggestion: CategorySuggestion) => void;
}

/** The categories the assistant suggests: remove any, or add others by hand. */
export default function CategorySuggestions({ confirmed, onToggle }: CategorySuggestionsProps) {
  const unselected = Object.values(TradeCategory).filter((c) => !confirmed.some((s) => s.category === c));

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-ink">Suggested categories</h3>
        <span className="text-xs text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">{confirmed.length} selected</span>
      </div>

      <div className="space-y-2 mb-4">
        {confirmed.map((suggestion) => (
          <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2" key={suggestion.category}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-medium text-ink">{categoryLabel(suggestion.category)}</div>
                <p className="text-xs text-gray-500 mt-0.5">{suggestion.reason}</p>
              </div>
              <Button className="text-xs text-gray-400 hover:text-red-600" onClick={() => onToggle(suggestion)} variant="bare">✕</Button>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t pt-3">
        <p className="text-xs text-gray-500 mb-2">Add a category</p>
        <div className="flex flex-wrap gap-1">
          {unselected.map((category) => (
            <Button
              className="text-xs rounded border border-gray-200 px-2 py-1 hover:border-brand-400 hover:bg-brand-50"
              key={category}
              onClick={() => onToggle({ category, reason: 'Added manually.' })}
              variant="bare"
            >
              {categoryLabel(category)}
            </Button>
          ))}
        </div>
      </div>
    </>
  );
}
