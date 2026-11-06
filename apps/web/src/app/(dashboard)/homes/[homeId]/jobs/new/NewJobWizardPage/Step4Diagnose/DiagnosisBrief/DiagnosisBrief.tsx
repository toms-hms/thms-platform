import type { AiSessionSummary } from '@/types/api';

/** The contractor-ready brief the assistant builds, or a placeholder until it has enough to go on. */
export default function DiagnosisBrief({ summary }: { summary: AiSessionSummary | null }) {
  return (
    <>
      <h3 className="text-sm font-semibold text-ink mb-3">Brief</h3>
      {!summary ? (
        <p className="text-xs text-gray-400">The AI will generate a contractor-ready brief here once it has enough context.</p>
      ) : (
        <div className="space-y-3 text-sm text-gray-700">
          {'rootCause' in summary && (
            <>
              <div><span className="font-medium">Issue:</span> {summary.rootCause}</div>
              <div><span className="font-medium">Severity:</span> {summary.severity}</div>
            </>
          )}
          {'frequency' in summary && <div><span className="font-medium">Frequency:</span> {summary.frequency}</div>}
          <div><span className="font-medium">Scope:</span> {summary.scope}</div>
          <div>
            <span className="font-medium">Est. cost:</span>{' '}
            ${summary.priceRange[0].toLocaleString()} – ${summary.priceRange[1].toLocaleString()}
          </div>
          {'constraints' in summary && summary.constraints && summary.constraints.length > 0 && (
            <div><span className="font-medium">Constraints:</span> {summary.constraints.join(', ')}</div>
          )}
        </div>
      )}
    </>
  );
}
