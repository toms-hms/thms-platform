'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getJob } from './queries';
import JobOverview from '@/components/jobs/JobOverview';
import JobContractorsTab from '@/components/jobs/JobContractorsTab';
import CommunicationsTab from '@/components/communications/CommunicationsTab';
import QuotesTab from '@/components/jobs/QuotesTab';
import ImagesTab from '@/components/jobs/ImagesTab';

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
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  useEffect(() => {
    if (jobId) loadJob();
  }, [jobId]);

  async function loadJob() {
    try {
      const res = await getJob(jobId);
      setJob(res.data);
    } catch {}
    setLoading(false);
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;
  if (!job) return <div className="text-center py-12 text-gray-500">Job not found</div>;

  const needsReviewCount = job.communications?.filter((c: any) => c.needsReview).length || 0;

  return (
    <div>
      <div className="mb-6">
        <Link href={`/homes/${homeId}`} className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to Home
        </Link>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {TABS.map((tab) => (
            <button
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
            </button>
          ))}
        </nav>
      </div>

      <div className="card p-6">
        {activeTab === 'overview' && (
          <JobOverview job={job} onUpdated={(updated) => setJob({ ...job, ...updated })} />
        )}
        {activeTab === 'contractors' && <JobContractorsTab job={job} />}
        {activeTab === 'communications' && <CommunicationsTab jobId={jobId} />}
        {activeTab === 'quotes' && <QuotesTab job={job} />}
        {activeTab === 'images' && <ImagesTab jobId={jobId} />}
      </div>
    </div>
  );
}
