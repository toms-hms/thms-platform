'use client';
import { useState } from 'react';
import { JobIntent, TradeCategory } from '@thms/shared';
import { CATEGORY_CONFIG } from './categoryConfig';

const ISSUE_TILES = CATEGORY_CONFIG[JobIntent.ISSUE];

const INTENT_LABELS: Record<JobIntent, string> = {
  [JobIntent.ISSUE]:          'What needs fixing?',
  [JobIntent.IMPROVEMENT]:    'What would you like to improve?',
  [JobIntent.RECURRING_WORK]: 'What needs regular maintenance?',
};

interface Props {
  intent: JobIntent;
  onSelect?: (category: TradeCategory) => void;
  onSelectMultiple?: (categories: TradeCategory[]) => void;
  onBack: () => void;
}

export default function Step2Category({ intent, onSelect, onSelectMultiple, onBack }: Props) {
  const isMulti = intent === JobIntent.IMPROVEMENT;
  const [selected, setSelected] = useState<TradeCategory[]>([]);

  function toggleCategory(cat: TradeCategory) {
    setSelected(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-ink mb-2">{INTENT_LABELS[intent]}</h2>
      <p className="text-gray-500 mb-8">
        {isMulti
          ? 'Select all trades that apply to your project.'
          : 'Pick the trade that best fits your project.'}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {ISSUE_TILES.map((tile) => {
          const isSelected = isMulti && selected.includes(tile.tradeCategory);
          return (
            <button
              key={tile.tradeCategory}
              onClick={() =>
                isMulti
                  ? toggleCategory(tile.tradeCategory)
                  : onSelect?.(tile.tradeCategory)
              }
              className={`group text-left p-4 bg-white rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
                isSelected
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-gray-100 hover:border-brand-400 hover:shadow-md'
              }`}
            >
              <div className="text-2xl mb-2">{tile.emoji}</div>
              <div className={`font-semibold text-sm transition-colors ${
                isSelected ? 'text-brand-700' : 'text-ink group-hover:text-brand-700'
              }`}>
                {tile.label}
              </div>
              <div className="text-xs text-gray-400 mt-0.5 leading-snug">{tile.description}</div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-8">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">
          ← Back
        </button>
        {isMulti && (
          <button
            onClick={() => onSelectMultiple?.(selected)}
            disabled={selected.length === 0}
            className="btn-primary"
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
}
