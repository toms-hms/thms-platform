import { JobIntent, TradeCategory } from '@thms/shared';
import { CATEGORY_CONFIG } from './categoryConfig';

const INTENT_LABELS: Record<JobIntent, string> = {
  [JobIntent.ISSUE]:          'What needs fixing?',
  [JobIntent.IMPROVEMENT]:    'What would you like to improve?',
  [JobIntent.RECURRING_WORK]: 'What needs regular maintenance?',
};

interface Props {
  intent: JobIntent;
  onSelect: (category: TradeCategory) => void;
  onBack: () => void;
}

export default function Step2Category({ intent, onSelect, onBack }: Props) {
  const tiles = CATEGORY_CONFIG[intent];

  return (
    <div>
      <h2 className="text-2xl font-bold text-ink mb-2">{INTENT_LABELS[intent]}</h2>
      <p className="text-gray-500 mb-8">Pick the trade that best fits your project.</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {tiles.map((tile) => (
          <button
            key={tile.tradeCategory + tile.label}
            onClick={() => onSelect(tile.tradeCategory)}
            className="group text-left p-4 bg-white rounded-xl border-2 border-gray-100 hover:border-brand-400 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            <div className="text-2xl mb-2">{tile.emoji}</div>
            <div className="font-semibold text-sm text-ink group-hover:text-brand-700 transition-colors">
              {tile.label}
            </div>
            <div className="text-xs text-gray-400 mt-0.5 leading-snug">{tile.description}</div>
          </button>
        ))}
      </div>

      <button onClick={onBack} className="mt-8 text-sm text-gray-500 hover:text-gray-700">
        ← Back
      </button>
    </div>
  );
}
