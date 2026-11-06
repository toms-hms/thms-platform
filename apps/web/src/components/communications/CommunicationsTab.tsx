'use client';
import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { CommunicationsDocument } from './queries/__generated__/Communications.generated';
import { UpdateCommunicationDocument } from './mutations/__generated__/UpdateCommunication.generated';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { cn } from '@/lib/cn';

interface CommunicationsTabProps {
  jobId: string;
}

export default function CommunicationsTab({ jobId }: CommunicationsTabProps) {
  const [filter, setFilter] = useState<'all' | 'needsReview'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const { data, loading: fetching } = useQuery(CommunicationsDocument, {
    variables: { jobIds: [jobId], needsReview: filter === 'needsReview' ? true : undefined },
  });
  const comms = data?.communications ?? [];
  const loading = fetching && !data;
  const [updateCommunication] = useMutation(UpdateCommunicationDocument);

  async function markReviewed(commId: string) {
    try {
      await updateCommunication({ variables: { communicationId: commId, needsReview: false } });
    } catch {}
  }

  if (loading) return <div className="text-center py-8 text-gray-500">Loading...</div>;

  const needsReviewCount = comms.filter((c) => c.needsReview).length;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Button
          variant="bare"
          onClick={() => setFilter('all')}
          className={`text-sm font-medium px-3 py-1.5 rounded-full transition-colors ${
            filter === 'all'
              ? 'bg-brand-100 text-brand-700'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          All
        </Button>
        <Button
          variant="bare"
          onClick={() => setFilter('needsReview')}
          className={`text-sm font-medium px-3 py-1.5 rounded-full transition-colors ${
            filter === 'needsReview'
              ? 'bg-yellow-100 text-yellow-700'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Needs Review {needsReviewCount > 0 && <span className="ml-1">({needsReviewCount})</span>}
        </Button>
      </div>

      {comms.length === 0 ? (
        <EmptyState
          title="No communications yet"
          description="Emails sent and received will appear here."
        />
      ) : (
        <div className="space-y-3">
          {comms.map((comm) => (
            <Card
              key={comm.id}
              className={cn('p-4', comm.needsReview && 'border-yellow-300 bg-yellow-50/50')}
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
                <Button
                  variant="bare"
                  onClick={() => setExpanded(expanded === comm.id ? null : comm.id)}
                  className="text-xs text-brand-600 hover:text-brand-700"
                >
                  {expanded === comm.id ? 'Hide' : 'View full message'}
                </Button>
                {comm.needsReview && (
                  <Button
                    variant="bare"
                    onClick={() => markReviewed(comm.id)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Mark reviewed
                  </Button>
                )}
              </div>

              {expanded === comm.id && (
                <div className="mt-3 text-sm text-gray-700 whitespace-pre-wrap border-t border-gray-100 pt-3">
                  {comm.bodyText || comm.bodyHtml?.replace(/<[^>]+>/g, '') || '(empty)'}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
