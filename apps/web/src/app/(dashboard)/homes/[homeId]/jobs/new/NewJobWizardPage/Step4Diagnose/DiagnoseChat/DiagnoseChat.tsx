'use client';
import { useEffect, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import type { HistoryEntry } from '../types';

const ASSISTANT_BUBBLE = 'max-w-[85%] rounded-lg bg-gray-100 px-4 py-2.5 text-sm';

interface DiagnoseChatProps {
  error: string;
  hasSuggestions: boolean;
  history: HistoryEntry[];
  isDone: boolean;
  loading: boolean;
  onAnswer: (answer: string) => void;
  options: string[];
  question: string | null;
}

/** The conversation: answered questions, the current question with suggested answers, and a free-text reply. */
export default function DiagnoseChat({
  error,
  hasSuggestions,
  history,
  isDone,
  loading,
  onAnswer,
  options,
  question,
}: DiagnoseChatProps) {
  const [customAnswer, setCustomAnswer] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, question]);

  function send(reply: string) {
    setCustomAnswer('');
    onAnswer(reply);
  }

  return (
    <div className="flex flex-col rounded-lg border border-gray-200 bg-white p-4">
      <div className="space-y-4 min-h-[280px]">
        {history.map((entry, i) => (
          <div className="space-y-2" key={i}>
            <div className={`${ASSISTANT_BUBBLE} font-medium text-gray-800`}>{entry.question}</div>
            <div className="ml-auto max-w-[85%] rounded-lg bg-brand-600 px-4 py-2.5 text-sm text-white">{entry.answer}</div>
          </div>
        ))}

        {loading && !question && <div className={`${ASSISTANT_BUBBLE} text-gray-400 animate-pulse`}>Thinking…</div>}

        {question && (
          <div className="space-y-3">
            <div className={`${ASSISTANT_BUBBLE} font-medium text-gray-800`}>{question}</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {options.map((option) => (
                <Button
                  className="rounded-lg border border-gray-200 px-3 py-2 text-left text-sm text-gray-700 hover:border-brand-400 hover:bg-brand-50 transition-colors"
                  disabled={loading}
                  key={option}
                  onClick={() => send(option)}
                  variant="bare"
                >
                  {option}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                className="flex-1 text-sm"
                disabled={loading}
                onChange={(e) => setCustomAnswer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && customAnswer.trim() && send(customAnswer.trim())}
                placeholder="Or type your own answer…"
                value={customAnswer}
              />
              <Button disabled={!customAnswer.trim() || loading} onClick={() => send(customAnswer.trim())} variant="secondary">
                Send
              </Button>
            </div>
          </div>
        )}

        {isDone && !question && (
          <div className={`${ASSISTANT_BUBBLE} text-gray-700`}>
            {hasSuggestions
              ? "Based on your answers, I've suggested updated categories on the right. Review and confirm before continuing."
              : "I've put together a brief based on your answers. Review it on the right and continue when ready."}
          </div>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
