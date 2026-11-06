import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Modal from '@/components/ui/Modal';

describe('Modal', () => {
  it('calls onClose when close button clicked', () => {
    const onClose = jest.fn();
    render(
      <Modal title="Close Test" open={true} onClose={onClose}>
        <p>Content</p>
      </Modal>
    );
    fireEvent.click(screen.getByText('×'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop clicked', () => {
    const onClose = jest.fn();
    const { container } = render(
      <Modal title="Backdrop Test" open={true} onClose={onClose}>
        <p>Content</p>
      </Modal>
    );
    // Click the backdrop (first div after the wrapper)
    const backdrop = container.querySelector('.absolute.inset-0');
    if (backdrop) fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });
});
