'use client';
import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import Button from './Button';

export interface Column<T> {
  /** Classes for this column's cells, e.g. `text-right` for an actions column. */
  className?: string;
  header: string;
  /** Classes for this column's header cell. */
  headerClassName?: string;
  key: string;
  /** Renders the cell; without it the cell shows `row[key]`. */
  render?: (row: T) => ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  emptyMessage?: string;
  getKey: (row: T) => string;
  /** Makes each row clickable. Rows carry Tailwind's `group` class, so cells can reveal controls on hover. */
  onRowClick?: (row: T) => void;
  /** Rows per page; the pager appears only when there are more rows than this. */
  pageSize?: number;
  rows: T[];
}

/** A paged table. Columns declare their header and how to render a cell. */
export default function Table<T>({
  columns,
  emptyMessage = 'No data',
  getKey,
  onRowClick,
  pageSize = 10,
  rows,
}: TableProps<T>) {
  const [requestedPage, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  // When a filter shrinks the rows, stay on the last page that still exists.
  const page = Math.min(requestedPage, totalPages - 1);
  const slice = rows.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 bg-white text-sm">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  className={cn('px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider', col.headerClassName)}
                  key={col.key}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {slice.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-gray-400" colSpan={columns.length}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              slice.map((row) => (
                <tr
                  className={cn('group hover:bg-gray-50', onRowClick && 'cursor-pointer')}
                  key={getKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <td className={cn('px-4 py-3 text-gray-700', col.className)} key={col.key}>
                      {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {rows.length > pageSize && (
        <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
          <span>{rows.length} total</span>
          <div className="flex items-center gap-2">
            <Button
              className="disabled:opacity-40"
              disabled={page === 0}
              onClick={() => setPage(Math.max(0, page - 1))}
              size="sm"
              variant="secondary"
            >
              ← Prev
            </Button>
            <span>Page {page + 1} of {totalPages}</span>
            <Button
              className="disabled:opacity-40"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              size="sm"
              variant="secondary"
            >
              Next →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
