'use client';
import { useState } from 'react';
import Link from '@/components/ui/Link';
import { useParams } from 'next/navigation';
import { useQuery } from '@apollo/client/react';
import { JobDetailDocument } from '@/components/jobs/queries/__generated__/JobDetail.generated';
import JobOverview from '@/components/jobs/JobOverview';
import JobContractorsTab from '@/components/jobs/JobContractorsTab';
import CommunicationsTab from '@/components/communications/CommunicationsTab';
import QuotesTab from '@/components/jobs/QuotesTab';
import ImagesTab from '@/components/jobs/ImagesTab';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

type Tab = 'overview' | 'contractors' | 'communications' | 'quotes' | 'images';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'contractors', label: 'Contractors' },
  { id: 'communications', label: 'Communications' },
  { id: 'quotes', label: 'Quotes' },
  { id: 'images', label: 'Photos & AI' },
];

export default function JobDetailPage() {
  const { homeId, jobId } = useParams<{ homeId: string; jobId: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const { data, loading: fetching } = useQuery(JobDetailDocument, { variables: { jobId } });
  const job = data?.job;
  const loading = fetching && !data;

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;
  if (!job) return <div className="text-center py-12 text-gray-500">Job not found</div>;

  const needsReviewCount = job.communications.filter((c) => c.needsReview).length;

  return (
    <div>
      <div className="mb-6">
        <Link variant="muted" href={`/homes/${homeId}`}>
          ← Back to Home
        </Link>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {TABS.map((tab) => (
            <Button
              variant="bare"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
              {tab.id === 'communications' && needsReviewCount > 0 && (
                <span className="ml-1.5 bg-yellow-400 text-yellow-900 text-xs rounded-full px-1.5 py-0.5">
                  {needsReviewCount}
                </span>
              )}
            </Button>
          ))}
        </nav>
      </div>

      <Card className="p-6">
        {activeTab === 'overview' && (
          <JobOverview job={job} />
        )}
        {activeTab === 'contractors' && <JobContractorsTab job={job} />}
        {activeTab === 'communications' && <CommunicationsTab jobId={jobId} />}
        {activeTab === 'quotes' && <QuotesTab job={job} />}
        {activeTab === 'images' && <ImagesTab jobId={jobId} />}
      </Card>
    </div>
  );
}
