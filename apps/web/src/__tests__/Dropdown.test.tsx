import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dropdown, { DropdownItem } from '@/components/ui/Dropdown';

const makeItems = (onClick = jest.fn()): DropdownItem[] => [
  { label: 'Edit', onClick },
  { label: 'Delete', danger: true, onClick },
];

describe('Dropdown', () => {
  it('does not show menu initially', () => {
    render(<Dropdown trigger={<button>Open</button>} items={makeItems()} />);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens menu on trigger click', () => {
    render(<Dropdown trigger={<button>Open</button>} items={makeItems()} />);
    fireEvent.click(screen.getByText('Open'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('calls item onClick and closes menu', () => {
    const onClick = jest.fn();
    render(<Dropdown trigger={<button>Open</button>} items={makeItems(onClick)} />);
    fireEvent.click(screen.getByText('Open'));
    fireEvent.click(screen.getByText('Edit'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes on Escape key', () => {
    render(<Dropdown trigger={<button>Open</button>} items={makeItems()} />);
    fireEvent.click(screen.getByText('Open'));
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('disables disabled items', () => {
    const items: DropdownItem[] = [{ label: 'Disabled', onClick: jest.fn(), disabled: true }];
    render(<Dropdown trigger={<button>Open</button>} items={items} />);
    fireEvent.click(screen.getByText('Open'));
    expect(screen.getByText('Disabled')).toBeDisabled();
  });
});
