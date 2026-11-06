'use client';
import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Link from '@/components/ui/Link';
import PageHeader from '@/components/ui/PageHeader';
import type { TradeCategory } from '@/graphql/types.generated';
import { getStoredUser } from '@/lib/auth';
import { UserRole } from '@/types/api';
import ContractorFilters from './ContractorFilters';
import ContractorFormModal from './ContractorFormModal';
import ContractorTable from './ContractorTable';
import { ContractorsDocument } from './queries/__generated__/Contractors.generated';
import type { Contractor, ContractorFilterValues } from './types';

const NO_FILTERS: ContractorFilterValues = { search: '', tradeCategory: '', zipCode: '' };

/** The global contractor directory: filter it, add contractors to your rolodex, and (admins) edit it. */
export default function ContractorsPage() {
  const isAdmin = getStoredUser()?.role === UserRole.ADMIN;
  const [filters, setFilters] = useState(NO_FILTERS);
  const [editing, setEditing] = useState<Contractor | 'new' | null>(null);
  const { data, loading: fetching, refetch } = useQuery(ContractorsDocument, {
    variables: {
      search: filters.search || undefined,
      tradeCategories: filters.tradeCategory ? [filters.tradeCategory as TradeCategory] : undefined,
      zipCodes: filters.zipCode.trim() ? [filters.zipCode.trim()] : undefined,
    },
  });
  const contractors = data?.contractors ?? [];
  const loading = fetching && !data;

  return (
    <div>
      <PageHeader
        actions={
          <>
            <Link href="/my-rolodex" variant="secondary">My Rolodex</Link>
            {isAdmin && <Button onClick={() => setEditing('new')} variant="primary">+ Add Vendor</Button>}
          </>
        }
        title="Vendors"
      />

      <ContractorFilters onChange={setFilters} value={filters} />

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : contractors.length === 0 ? (
        <EmptyState
          action={isAdmin ? <Button onClick={() => setEditing('new')} variant="primary">Add Vendor</Button> : undefined}
          description="Clear filters or add a vendor to the global list."
          title="No vendors found"
        />
      ) : (
        <ContractorTable contractors={contractors} isAdmin={isAdmin} onDeleted={refetch} onEdit={setEditing} />
      )}

      <ContractorFormModal contractor={editing} onClose={() => setEditing(null)} onSaved={refetch} />
    </div>
  );
}
