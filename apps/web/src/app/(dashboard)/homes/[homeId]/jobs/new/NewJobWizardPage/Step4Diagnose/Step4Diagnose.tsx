'use client';
import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import Button from '@/components/ui/Button';
import { JobIntent, type TradeCategory } from '@/graphql/types.generated';
import type { AiSessionSummary } from '@/types/api';
import CategorySuggestions from './CategorySuggestions';
import DiagnoseChat from './DiagnoseChat';
import DiagnosisBrief from './DiagnosisBrief';
import { DiagnoseJobDocument } from './mutations/__generated__/DiagnoseJob.generated';
import { StartDiagnoseDocument, type StartDiagnoseMutation } from './mutations/__generated__/StartDiagnose.generated';
import type { CategorySuggestion, HistoryEntry } from './types';

const TITLES: Record<JobIntent, string> = {
  [JobIntent.IMPROVEMENT]: 'AI Planning',
  [JobIntent.ISSUE]: 'AI Diagnosis',
  [JobIntent.RECURRING_WORK]: 'AI Estimate',
};

type DiagnoseResult = NonNullable<StartDiagnoseMutation['startDiagnose']>['result'];

/** One assistant turn, with its JSON-encoded fields parsed. */
interface Turn {
  options: string[];
  question: string | null;
  suggestedCategories: CategorySuggestion[] | null;
  summary: AiSessionSummary | null;
}

function toTurn(result: DiagnoseResult | null | undefined): Turn {
  if (!result) throw new Error('Something went wrong. Please try again.');
  return {
    options: result.options,
    question: result.question,
    suggestedCategories:
      result.suggestedCategories?.map((s) => ({ category: s.category as TradeCategory, reason: s.reason })) ?? null,
    summary: result.summary ? JSON.parse(result.summary) : null,
  };
}

interface Step4DiagnoseProps {
  intent: JobIntent;
  jobId: string;
  onBack: () => void;
  onNext: (summary: AiSessionSummary | null, confirmedCategories: CategorySuggestion[] | null) => void;
}

/** Step 4: the AI asks a few questions, then proposes a brief or a better set of trade categories. */
export default function Step4Diagnose({ intent, jobId, onBack, onNext }: Step4DiagnoseProps) {
  const [startDiagnose] = useMutation(StartDiagnoseDocument);
  const [diagnoseJob] = useMutation(DiagnoseJobDocument);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [question, setQuestion] = useState<string | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [summary, setSummary] = useState<AiSessionSummary | null>(null);
  const [suggestions, setSuggestions] = useState<CategorySuggestion[] | null>(null);
  const [confirmed, setConfirmed] = useState<CategorySuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function applyTurn(turn: Turn) {
    if (turn.suggestedCategories) {
      setSuggestions(turn.suggestedCategories);
      setConfirmed(turn.suggestedCategories);
    }
    if (turn.summary) setSummary(turn.summary);
    setQuestion(turn.question);
    setOptions(turn.options);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await startDiagnose({ variables: { jobId } });
        if (!cancelled) applyTurn(toTurn(data?.startDiagnose?.result));
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to start. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId, startDiagnose]);

  async function answer(reply: string) {
    if (!question || loading) return;
    const asked = question;
    setHistory((prev) => [...prev, { answer: reply, question: asked }]);
    setQuestion(null);
    setOptions([]);
    setLoading(true);
    setError('');
    try {
      const { data } = await diagnoseJob({ variables: { jobId, message: reply } });
      applyTurn(toTurn(data?.diagnoseJob?.result));
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
      setQuestion(asked);
    } finally {
      setLoading(false);
    }
  }

  function toggleCategory(suggestion: CategorySuggestion) {
    setConfirmed((prev) =>
      prev.some((c) => c.category === suggestion.category)
        ? prev.filter((c) => c.category !== suggestion.category)
        : [...prev, suggestion]
    );
  }

  const isDone = summary !== null;

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold text-ink mb-2">{TITLES[intent]}</h2>
      <p className="text-sm text-gray-500 mb-6">
        Answer a few quick questions — the AI will put together a contractor-ready brief.
      </p>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <DiagnoseChat
          error={error}
          hasSuggestions={suggestions !== null}
          history={history}
          isDone={isDone}
          loading={loading}
          onAnswer={answer}
          options={options}
          question={question}
        />
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          {suggestions ? (
            <CategorySuggestions confirmed={confirmed} onToggle={toggleCategory} />
          ) : (
            <DiagnosisBrief summary={summary} />
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-8">
        <Button onClick={onBack} variant="muted">← Back</Button>
        <div className="flex gap-3">
          <Button onClick={() => onNext(null, null)} variant="muted">Skip</Button>
          <Button onClick={() => onNext(summary, suggestions ? confirmed : null)} variant="primary">
            {isDone ? 'Continue' : 'Skip for now →'}
          </Button>
        </div>
      </div>
    </div>
  );
}
