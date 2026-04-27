import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatusBadge from '@/components/ui/StatusBadge';

describe('StatusBadge', () => {
  it('renders job status correctly', () => {
    render(<StatusBadge status="DRAFT" type="job" />);
    expect(screen.getByText('DRAFT')).toBeInTheDocument();
  });

  it('renders contractor status with underscores replaced by spaces', () => {
    render(<StatusBadge status="NOT_CONTACTED" type="contractor" />);
    expect(screen.getByText('NOT CONTACTED')).toBeInTheDocument();
  });

  it('renders QUOTE_RECEIVED correctly', () => {
    render(<StatusBadge status="QUOTE_RECEIVED" type="contractor" />);
    expect(screen.getByText('QUOTE RECEIVED')).toBeInTheDocument();
  });

  it('applies correct color class for COMPLETED', () => {
    const { container } = render(<StatusBadge status="COMPLETED" />);
    expect(container.firstChild).toHaveClass('bg-green-100');
  });
});
