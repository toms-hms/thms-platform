'use client';
import { useState, useEffect } from 'react';
import { listCommunications } from './queries';
import { updateCommunication } from './mutations';
import EmptyState from '@/components/ui/EmptyState';

interface Props {
  jobId: string;
}

export default function CommunicationsTab({ jobId }: Props) {
  const [comms, setComms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'needsReview'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [jobId, filter]);

  async function load() {
    setLoading(true);
    try {
      const params =
        filter === 'needsReview'
          ? { needsReview: true }
          : undefined;
      const res = await listCommunications(jobId, params);
      setComms(res.data);
    } catch {}
    setLoading(false);
  }

  async function markReviewed(commId: string) {
    try {
      await updateCommunication(commId, { needsReview: false });
      setComms((prev) =>
        prev.map((c) => (c.id === commId ? { ...c, needsReview: false } : c))
      );
    } catch {}
  }

  if (loading) return <div className="text-center py-8 text-gray-500">Loading...</div>;

  const needsReviewCount = comms.filter((c) => c.needsReview).length;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`text-sm font-medium px-3 py-1.5 rounded-full transition-colors ${
            filter === 'all'
              ? 'bg-brand-100 text-brand-700'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('needsReview')}
          className={`text-sm font-medium px-3 py-1.5 rounded-full transition-colors ${
            filter === 'needsReview'
              ? 'bg-yellow-100 text-yellow-700'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Needs Review {needsReviewCount > 0 && <span className="ml-1">({needsReviewCount})</span>}
        </button>
      </div>

      {comms.length === 0 ? (
        <EmptyState
          title="No communications yet"
          description="Emails sent and received will appear here."
        />
      ) : (
        <div className="space-y-3">
          {comms.map((comm) => (
            <div
              key={comm.id}
              className={`card p-4 ${comm.needsReview ? 'border-yellow-300 bg-yellow-50/50' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded ${
                      comm.direction === 'SENT'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {comm.direction === 'SENT' ? '→ Sent' : '← Received'}
                  </span>
                  {comm.needsReview && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                      Needs Review
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(comm.sentAt || comm.receivedAt || comm.createdAt).toLocaleString()}
                </span>
              </div>

              <p className="font-medium text-gray-900 text-sm mt-2">
                {comm.subject || '(No subject)'}
              </p>
              {comm.contractor && (
                <p className="text-xs text-gray-500 mt-0.5">{comm.contractor.name}</p>
              )}

              {comm.parsedSummary && (
                <p className="text-sm text-gray-600 mt-2 italic">{comm.parsedSummary}</p>
              )}

              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={() => setExpanded(expanded === comm.id ? null : comm.id)}
                  className="text-xs text-brand-600 hover:text-brand-700"
                >
                  {expanded === comm.id ? 'Hide' : 'View full message'}
                </button>
                {comm.needsReview && (
                  <button
                    onClick={() => markReviewed(comm.id)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Mark reviewed
                  </button>
                )}
              </div>

              {expanded === comm.id && (
                <div className="mt-3 text-sm text-gray-700 whitespace-pre-wrap border-t border-gray-100 pt-3">
                  {comm.bodyText || comm.bodyHtml?.replace(/<[^>]+>/g, '') || '(empty)'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
