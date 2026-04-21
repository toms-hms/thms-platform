interface Props {
  currentStep: number;
  totalSteps: number;
  labels: string[];
}

export default function WizardProgress({ currentStep, totalSteps, labels }: Props) {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-0">
        {labels.map((label, i) => {
          const step = i + 1;
          const done = step < currentStep;
          const active = step === currentStep;
          const last = i === labels.length - 1;

          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  done    ? 'bg-brand-600 text-white' :
                  active  ? 'bg-brand-600 text-white ring-4 ring-brand-100' :
                            'bg-gray-100 text-gray-400'
                }`}>
                  {done ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : step}
                </div>
                <span className={`mt-1.5 text-xs font-medium whitespace-nowrap ${active ? 'text-brand-700' : done ? 'text-brand-600' : 'text-gray-400'}`}>
                  {label}
                </span>
              </div>
              {!last && (
                <div className={`flex-1 h-px mx-2 mb-5 transition-colors ${done ? 'bg-brand-600' : 'bg-gray-200'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
