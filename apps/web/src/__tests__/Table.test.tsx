import { fireEvent, render, screen } from '@testing-library/react';
import Table, { type Column } from '@/components/ui/Table';

interface Row {
  id: string;
  name: string;
}

const COLUMNS: Column<Row>[] = [{ header: 'Name', key: 'name' }];

const rows = (n: number): Row[] => Array.from({ length: n }, (_, i) => ({ id: String(i), name: `Item ${i}` }));

describe('Table', () => {
  it('pages through rows', () => {
    render(<Table columns={COLUMNS} getKey={(r) => r.id} pageSize={10} rows={rows(25)} />);
    fireEvent.click(screen.getByText('Next →'));
    expect(screen.getByText('Item 10')).toBeInTheDocument();
    expect(screen.queryByText('Item 0')).not.toBeInTheDocument();
  });

  it('stays on the last page that exists when the rows shrink', () => {
    const { rerender } = render(<Table columns={COLUMNS} getKey={(r) => r.id} pageSize={10} rows={rows(25)} />);
    fireEvent.click(screen.getByText('Next →'));
    fireEvent.click(screen.getByText('Next →'));
    rerender(<Table columns={COLUMNS} getKey={(r) => r.id} pageSize={10} rows={rows(12)} />);
    expect(screen.getByText('Item 10')).toBeInTheDocument();
  });

  it('calls onRowClick with the clicked row', () => {
    const onRowClick = jest.fn();
    render(<Table columns={COLUMNS} getKey={(r) => r.id} onRowClick={onRowClick} rows={rows(3)} />);
    fireEvent.click(screen.getByText('Item 1'));
    expect(onRowClick).toHaveBeenCalledWith({ id: '1', name: 'Item 1' });
  });
});
