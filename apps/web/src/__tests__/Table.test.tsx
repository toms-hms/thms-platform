import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Table, { Column } from '@/components/ui/Table';

interface Row { id: string; name: string; value: number }

const COLS: Column<Row>[] = [
  { key: 'name', header: 'Name' },
  { key: 'value', header: 'Value' },
];

const makeRows = (n: number): Row[] =>
  Array.from({ length: n }, (_, i) => ({ id: String(i), name: `Item ${i}`, value: i }));

describe('Table', () => {
  it('renders headers and rows', () => {
    render(<Table columns={COLS} rows={makeRows(3)} getKey={(r) => r.id} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Item 0')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('shows empty message when no rows', () => {
    render(<Table columns={COLS} rows={[]} getKey={(r) => r.id} emptyMessage="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('paginates and shows prev/next', () => {
    render(<Table columns={COLS} rows={makeRows(25)} getKey={(r) => r.id} pageSize={10} />);
    expect(screen.getByText('Item 0')).toBeInTheDocument();
    expect(screen.queryByText('Item 10')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Next →'));
    expect(screen.getByText('Item 10')).toBeInTheDocument();
    expect(screen.queryByText('Item 0')).not.toBeInTheDocument();
  });

  it('disables Prev on first page', () => {
    render(<Table columns={COLS} rows={makeRows(25)} getKey={(r) => r.id} pageSize={10} />);
    expect(screen.getByText('← Prev')).toBeDisabled();
  });

  it('uses custom render', () => {
    const cols: Column<Row>[] = [
      { key: 'name', header: 'Name', render: (r) => <strong data-testid="custom">{r.name}</strong> },
    ];
    render(<Table columns={cols} rows={makeRows(1)} getKey={(r) => r.id} />);
    expect(screen.getByTestId('custom')).toBeInTheDocument();
  });
});
