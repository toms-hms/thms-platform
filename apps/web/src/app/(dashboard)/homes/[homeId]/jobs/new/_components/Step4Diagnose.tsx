interface Props {
  onNext: () => void;
  onBack: () => void;
}

export default function Step4Diagnose({ onNext, onBack }: Props) {
  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-ink mb-2">AI Diagnosis</h2>
      <p className="text-gray-500 mb-8">Our AI will analyze your issue and prepare a contractor-ready brief.</p>

      <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-10 text-center">
        <div className="text-5xl mb-4">🤖</div>
        <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs font-medium px-3 py-1 rounded-full mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
          Coming soon
        </div>
        <h3 className="font-semibold text-gray-800 mb-2">AI-powered diagnostic questions</h3>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">
          Soon you'll answer a few guided questions and the AI will generate a
          contractor-ready summary — so quotes come back apples-to-apples.
        </p>
      </div>

      <div className="flex items-center justify-between mt-8">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">
          ← Back
        </button>
        <button onClick={onNext} className="btn-primary">
          Skip for now →
        </button>
      </div>
    </div>
  );
}
