'use client';
import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import PageHeader from '@/components/ui/PageHeader';
import { getStoredUser } from '@/lib/auth';
import ContractorEditModal from './ContractorEditModal';
import ContractorJobHistory from './ContractorJobHistory';
import ContractorProfile from './ContractorProfile';
import { ContractorDocument } from './queries/__generated__/Contractor.generated';

/** One contractor: their details and contact, the jobs they've worked on, and (admins) an edit form. */
export default function ContractorDetailPage() {
  const { contractorId } = useParams<{ contractorId: string }>();
  const { data, loading } = useQuery(ContractorDocument, { variables: { contractorId } });
  const contractor = data?.contractor;
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setIsAdmin(getStoredUser()?.role === 'ADMIN');
  }, []);

  if (loading && !data) return <div className="text-center py-12 text-gray-400">Loading...</div>;
  if (!contractor) return <div className="text-center py-12 text-gray-400">Contractor not found</div>;

  return (
    <div>
      <PageHeader
        actions={
          isAdmin && (
            <Button className="text-sm" onClick={() => setEditing(true)} variant="secondary">
              Edit
            </Button>
          )
        }
        back={{ href: '/contractors', label: 'Contractors' }}
        subtitle={contractor.companyName}
        title={contractor.name}
      />
      <ContractorProfile contractor={contractor} />
      <ContractorJobHistory contractorId={contractorId} />
      <ContractorEditModal contractor={contractor} onClose={() => setEditing(false)} open={editing} />
    </div>
  );
}
