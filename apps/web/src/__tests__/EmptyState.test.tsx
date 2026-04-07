import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import EmptyState from '@/components/ui/EmptyState';

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<EmptyState title="Empty" description="Add something to get started" />);
    expect(screen.getByText('Add something to get started')).toBeInTheDocument();
  });

  it('renders action when provided', () => {
    render(
      <EmptyState
        title="Empty"
        action={<button>Add Item</button>}
      />
    );
    expect(screen.getByText('Add Item')).toBeInTheDocument();
  });

  it('does not render description section when not provided', () => {
    const { container } = render(<EmptyState title="Empty" />);
    expect(container.querySelectorAll('p').length).toBe(0);
  });
});
