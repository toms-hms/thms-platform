'use client';
import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Table, { type Column } from '@/components/ui/Table';
import type { TradeCategory } from '@/graphql/types.generated';
import { tradeCategoryLabel } from '@/lib/tradeCategories';
import type { Contractor } from '../types';
import { AddContractorToRolodexDocument } from './mutations/__generated__/AddContractorToRolodex.generated';
import { DeleteContractorDocument } from './mutations/__generated__/DeleteContractor.generated';

interface ContractorTableProps {
  contractors: Contractor[];
  isAdmin: boolean;
  onDeleted: () => void;
  onEdit: (contractor: Contractor) => void;
}

/** The directory as a table. Each row opens the contractor; hover shows add, edit and delete. */
export default function ContractorTable({ contractors, isAdmin, onDeleted, onEdit }: ContractorTableProps) {
  const router = useRouter();
  const [addingId, setAddingId] = useState('');
  const [addToRolodex] = useMutation(AddContractorToRolodexDocument);
  const [deleteContractor] = useMutation(DeleteContractorDocument);

  async function handleAddToRolodex(contractor: Contractor) {
    setAddingId(contractor.id);
    try {
      await addToRolodex({
        variables: {
          contractorId: contractor.id,
          categories: contractor.categories as TradeCategory[],
          companyName: contractor.companyName || undefined,
          email: contractor.email || undefined,
          name: contractor.name,
          notes: contractor.notes || undefined,
          phone: contractor.phone || undefined,
          zipCodes: contractor.zipCodes.length ? contractor.zipCodes : undefined,
        },
      });
    } catch {
    } finally {
      setAddingId('');
    }
  }

  async function handleDelete(contractor: Contractor) {
    if (!confirm(`Delete ${contractor.name}?`)) return;
    try {
      await deleteContractor({ variables: { contractorId: contractor.id } });
      onDeleted();
    } catch {}
  }

  const columns: Column<Contractor>[] = [
    {
      header: 'Name',
      key: 'name',
      render: (contractor) => (
        <div>
          <span className="font-medium text-gray-900">{contractor.name}</span>
          {contractor.companyName && <span className="ml-2 text-gray-400 text-xs">- {contractor.companyName}</span>}
        </div>
      ),
    },
    {
      header: 'Categories',
      key: 'categories',
      render: (contractor) => (
        <div className="flex flex-wrap gap-1">
          {contractor.categories.map((value) => (
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs" key={value}>
              {tradeCategoryLabel(value)}
            </span>
          ))}
        </div>
      ),
    },
    {
      header: 'ZIP codes',
      key: 'zipCodes',
      render: (contractor) => (contractor.zipCodes.length ? contractor.zipCodes.join(', ') : '-'),
    },
    {
      header: 'Contact',
      key: 'contact',
      render: (contractor) => (
        <>
          <div>{contractor.email || '-'}</div>
          {contractor.phone && <div className="text-xs text-gray-400">{contractor.phone}</div>}
        </>
      ),
    },
    {
      className: 'text-right',
      header: '',
      key: 'actions',
      render: (contractor) => (
        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <Button
            aria-label="Add to my vendors"
            disabled={addingId === contractor.id}
            onClick={(e) => { e.stopPropagation(); handleAddToRolodex(contractor); }}
            size="sm"
            variant="secondary"
          >
            {addingId === contractor.id ? 'Adding...' : '☆ Add to my vendors'}
          </Button>
          {isAdmin && (
            <>
              <Button onClick={(e) => { e.stopPropagation(); onEdit(contractor); }} size="sm" variant="secondary">Edit</Button>
              <Button onClick={(e) => { e.stopPropagation(); handleDelete(contractor); }} size="sm" variant="danger">Delete</Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      getKey={(contractor) => contractor.id}
      onRowClick={(contractor) => router.push(`/contractors/${contractor.id}`)}
      pageSize={25}
      rows={contractors}
    />
  );
}
