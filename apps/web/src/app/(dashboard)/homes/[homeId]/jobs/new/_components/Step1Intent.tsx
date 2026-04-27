import { JobIntent } from '@thms/shared';

const INTENTS = [
  {
    value: JobIntent.ISSUE,
    label: 'Something needs fixing',
    description: 'Repair, inspect, or diagnose a problem with your home.',
    emoji: '🔧',
    examples: 'Leaking pipe · Broken outlet · Pest infestation',
  },
  {
    value: JobIntent.IMPROVEMENT,
    label: 'I want to upgrade',
    description: 'Remodel, install, or improve something in your home.',
    emoji: '⭐',
    examples: 'Kitchen remodel · New flooring · Deck addition',
  },
  {
    value: JobIntent.RECURRING_WORK,
    label: 'Scheduled maintenance',
    description: 'Regular upkeep to keep your home in top shape.',
    emoji: '🔄',
    examples: 'HVAC tune-up · Lawn care · Gutter cleaning',
  },
];

interface Props {
  onSelect: (intent: JobIntent) => void;
}

export default function Step1Intent({ onSelect }: Props) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-ink mb-2">What do you need help with?</h2>
      <p className="text-gray-500 mb-8">Choose the type of work — this helps us ask the right questions.</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {INTENTS.map((intent) => (
          <button
            key={intent.value}
            onClick={() => onSelect(intent.value)}
            className="group text-left p-6 bg-white rounded-xl border-2 border-gray-100 hover:border-brand-400 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            <div className="text-4xl mb-4">{intent.emoji}</div>
            <h3 className="font-semibold text-ink mb-1.5 group-hover:text-brand-700 transition-colors">
              {intent.label}
            </h3>
            <p className="text-sm text-gray-500 mb-3">{intent.description}</p>
            <p className="text-xs text-gray-400">{intent.examples}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
