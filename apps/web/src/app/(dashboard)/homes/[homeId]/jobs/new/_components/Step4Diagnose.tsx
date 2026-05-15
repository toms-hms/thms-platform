'use client';
import { useEffect, useRef, useState } from 'react';
import { type AiSessionSummary, JobIntent, TradeCategory } from '@thms/shared';
import { request } from '@/lib/api';
import { CATEGORY_CONFIG } from './categoryConfig';

const TITLES: Record<JobIntent, string> = {
  [JobIntent.ISSUE]:          'AI Diagnosis',
  [JobIntent.IMPROVEMENT]:    'AI Planning',
  [JobIntent.RECURRING_WORK]: 'AI Estimate',
};

interface CategorySuggestion {
  category: TradeCategory;
  reason: string;
}

interface TurnResult {
  question: string | null;
  options: string[];
  summary: AiSessionSummary | null;
  suggestedCategories: CategorySuggestion[] | null;
  messages: { role: string; content: string }[];
}

interface HistoryEntry {
  question: string;
  answer: string;
}

interface Props {
  intent: JobIntent;
  jobId: string;
  onNext: (summary: AiSessionSummary | null, confirmedCategories: CategorySuggestion[] | null) => void;
  onBack: () => void;
}

function categoryLabel(category: TradeCategory) {
  return CATEGORY_CONFIG[JobIntent.ISSUE].find(t => t.tradeCategory === category)?.label ?? category;
}

export default function Step4Diagnose({ intent, jobId, onNext, onBack }: Props) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [currentOptions, setCurrentOptions] = useState<string[]>([]);
  const [customAnswer, setCustomAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AiSessionSummary | null>(null);
  const [suggestedCategories, setSuggestedCategories] = useState<CategorySuggestion[] | null>(null);
  const [confirmedCategories, setConfirmedCategories] = useState<CategorySuggestion[]>([]);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { startSession(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [history, currentQuestion]);

  async function startSession() {
    setLoading(true);
    setError('');
    try {
      const res = await request<{ data: TurnResult }>(`/api/v1/jobs/${jobId}/diagnose/start`, { method: 'POST' });
      applyTurnResult(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to start. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function applyTurnResult(result: TurnResult) {
    if (result.suggestedCategories) {
      setSuggestedCategories(result.suggestedCategories);
      setConfirmedCategories(result.suggestedCategories);
    }
    if (result.summary) setSummary(result.summary);
    setCurrentQuestion(result.question);
    setCurrentOptions(result.options);
  }

  async function answerQuestion(answer: string) {
    if (!currentQuestion || loading) return;
    const question = currentQuestion;
    setHistory(prev => [...prev, { question, answer }]);
    setCurrentQuestion(null);
    setCurrentOptions([]);
    setCustomAnswer('');
    setLoading(true);
    setError('');
    try {
      const res = await request<{ data: TurnResult }>(`/api/v1/jobs/${jobId}/diagnose`, {
        method: 'POST',
        body: JSON.stringify({ message: answer }),
      });
      applyTurnResult(res.data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
      setCurrentQuestion(question);
    } finally {
      setLoading(false);
    }
  }

  function toggleCategory(suggestion: CategorySuggestion) {
    setConfirmedCategories(prev =>
      prev.some(c => c.category === suggestion.category)
        ? prev.filter(c => c.category !== suggestion.category)
        : [...prev, suggestion]
    );
  }

  const allCategories = Object.values(TradeCategory);
  const isDone = summary !== null;

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold text-ink mb-2">{TITLES[intent]}</h2>
      <p className="text-sm text-gray-500 mb-6">
        Answer a few quick questions — the AI will put together a contractor-ready brief.
      </p>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        {/* Q&A panel */}
        <div className="flex flex-col rounded-lg border border-gray-200 bg-white p-4">
          <div className="space-y-4 min-h-[280px]">
            {history.map((entry, i) => (
              <div key={i} className="space-y-2">
                <div className="max-w-[85%] rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-800">
                  {entry.question}
                </div>
                <div className="ml-auto max-w-[85%] rounded-lg bg-brand-600 px-4 py-2.5 text-sm text-white">
                  {entry.answer}
                </div>
              </div>
            ))}

            {loading && !currentQuestion && (
              <div className="max-w-[85%] rounded-lg bg-gray-100 px-4 py-2.5 text-sm text-gray-400 animate-pulse">
                Thinking…
              </div>
            )}

            {currentQuestion && (
              <div className="space-y-3">
                <div className="max-w-[85%] rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-800">
                  {currentQuestion}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {currentOptions.map(option => (
                    <button
                      key={option}
                      onClick={() => answerQuestion(option)}
                      disabled={loading}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-left text-sm text-gray-700 hover:border-brand-400 hover:bg-brand-50 transition-colors"
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={customAnswer}
                    onChange={e => setCustomAnswer(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && customAnswer.trim() && answerQuestion(customAnswer.trim())}
                    className="input flex-1 text-sm"
                    placeholder="Or type your own answer…"
                    disabled={loading}
                  />
                  <button
                    onClick={() => answerQuestion(customAnswer.trim())}
                    disabled={!customAnswer.trim() || loading}
                    className="btn-secondary"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}

            {isDone && !currentQuestion && (
              <div className="max-w-[85%] rounded-lg bg-gray-100 px-4 py-2.5 text-sm text-gray-700">
                {suggestedCategories
                  ? 'Based on your answers, I\'ve suggested updated categories on the right. Review and confirm before continuing.'
                  : 'I\'ve put together a brief based on your answers. Review it on the right and continue when ready.'}
              </div>
            )}

            {error && <p className="text-xs text-red-500">{error}</p>}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Right panel — category suggestions if present, otherwise brief */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          {suggestedCategories ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-ink">Suggested categories</h3>
                <span className="text-xs text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">{confirmedCategories.length} selected</span>
              </div>

              <div className="space-y-2 mb-4">
                {confirmedCategories.map(s => (
                  <div key={s.category} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium text-ink">{categoryLabel(s.category)}</div>
                        <p className="text-xs text-gray-500 mt-0.5">{s.reason}</p>
                      </div>
                      <button onClick={() => toggleCategory(s)} className="text-xs text-gray-400 hover:text-red-600">✕</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3">
                <p className="text-xs text-gray-500 mb-2">Add a category</p>
                <div className="flex flex-wrap gap-1">
                  {allCategories.filter(c => !confirmedCategories.some(s => s.category === c)).map(cat => (
                    <button
                      key={cat}
                      onClick={() => toggleCategory({ category: cat, reason: 'Added manually.' })}
                      className="text-xs rounded border border-gray-200 px-2 py-1 hover:border-brand-400 hover:bg-brand-50"
                    >
                      {categoryLabel(cat)}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-sm font-semibold text-ink mb-3">Brief</h3>
              {!summary ? (
                <p className="text-xs text-gray-400">
                  The AI will generate a contractor-ready brief here once it has enough context.
                </p>
              ) : (
                <div className="space-y-3 text-sm text-gray-700">
                  {'rootCause' in summary && (
                    <>
                      <div><span className="font-medium">Issue:</span> {summary.rootCause}</div>
                      <div><span className="font-medium">Severity:</span> {summary.severity}</div>
                    </>
                  )}
                  {'frequency' in summary && (
                    <div><span className="font-medium">Frequency:</span> {summary.frequency}</div>
                  )}
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
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-8">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
        <div className="flex gap-3">
          <button onClick={() => onNext(null, null)} className="text-sm text-gray-500 hover:text-gray-700">Skip</button>
          <button
            onClick={() => onNext(summary, suggestedCategories ? confirmedCategories : null)}
            className="btn-primary"
          >
            {isDone ? 'Continue' : 'Skip for now →'}
          </button>
        </div>
      </div>
    </div>
  );
}
