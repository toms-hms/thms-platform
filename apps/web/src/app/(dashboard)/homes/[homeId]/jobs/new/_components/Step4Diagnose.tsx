'use client';
import { useEffect, useRef, useState } from 'react';
import { type AiSessionSummary, JobIntent } from '@thms/shared';
import { request } from '@/lib/api';

const TITLES: Record<JobIntent, string> = {
  [JobIntent.ISSUE]:          'AI Diagnosis',
  [JobIntent.IMPROVEMENT]:    'AI Planning',
  [JobIntent.RECURRING_WORK]: 'AI Estimate',
};

interface TurnResult {
  question: string | null;
  options: string[];
  summary: AiSessionSummary | null;
  messages: { role: string; content: string }[];
}

interface HistoryEntry {
  question: string;
  answer: string;
}

interface Props {
  intent: JobIntent;
  jobId: string;
  onNext: (summary: AiSessionSummary | null) => void;
  onBack: () => void;
}

export default function Step4Diagnose({ intent, jobId, onNext, onBack }: Props) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [currentOptions, setCurrentOptions] = useState<string[]>([]);
  const [customAnswer, setCustomAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AiSessionSummary | null>(null);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startSession();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, currentQuestion]);

  async function startSession() {
    setLoading(true);
    setError('');
    try {
      const res = await request<{ data: TurnResult }>(`/api/v1/jobs/${jobId}/diagnose/start`, { method: 'POST' });
      applyResult(res.data, null);
    } catch (err: any) {
      setError(err.message || 'Failed to start. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function applyResult(result: TurnResult, answeredQuestion: string | null) {
    if (answeredQuestion !== null && currentQuestion) {
      // already appended to history via answerQuestion
    }
    if (result.summary) {
      setSummary(result.summary);
      setCurrentQuestion(null);
      setCurrentOptions([]);
    } else {
      setCurrentQuestion(result.question);
      setCurrentOptions(result.options);
    }
  }

  async function answerQuestion(answer: string) {
    if (!currentQuestion || loading) return;
    const question = currentQuestion;
    setHistory((prev) => [...prev, { question, answer }]);
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
      if (res.data.summary) {
        setSummary(res.data.summary);
      } else {
        setCurrentQuestion(res.data.question);
        setCurrentOptions(res.data.options);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
      // Restore so user can retry
      setCurrentQuestion(question);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold text-ink mb-2">{TITLES[intent]}</h2>
      <p className="text-sm text-gray-500 mb-6">
        Answer a few quick questions — the AI will put together a contractor-ready brief.
      </p>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        {/* Q&A panel */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="space-y-4 min-h-[280px]">
            {/* Completed Q&A history */}
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

            {/* Current question */}
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
                  {currentOptions.map((option) => (
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
                    onChange={(e) => setCustomAnswer(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && customAnswer.trim() && answerQuestion(customAnswer.trim())}
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

            {summary && !currentQuestion && (
              <div className="max-w-[85%] rounded-lg bg-gray-100 px-4 py-2.5 text-sm text-gray-700">
                I've put together a brief based on your answers. Review it on the right and continue when ready.
              </div>
            )}

            {error && <p className="text-xs text-red-500">{error}</p>}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Brief panel */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
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
              {summary.constraints && summary.constraints.length > 0 && (
                <div>
                  <span className="font-medium">Constraints:</span>{' '}
                  {summary.constraints.join(', ')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-8">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">
          ← Back
        </button>
        <div className="flex gap-3">
          <button onClick={() => onNext(null)} className="text-sm text-gray-500 hover:text-gray-700">
            Skip
          </button>
          <button onClick={() => onNext(summary)} className="btn-primary">
            {summary ? 'Continue' : 'Skip for now →'}
          </button>
        </div>
      </div>
    </div>
  );
}
