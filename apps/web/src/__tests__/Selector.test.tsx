import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Selector, { SelectorOption } from '@/components/ui/Selector';

const OPTIONS: SelectorOption[] = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
  { value: 'c', label: 'Cherry' },
];

describe('Selector', () => {
  it('calls onChange when option selected', () => {
    const onChange = jest.fn();
    render(<Selector options={OPTIONS} value="" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.mouseDown(screen.getByText('Cherry'));
    expect(onChange).toHaveBeenCalledWith('c');
  });

  it('filters options by search', () => {
    render(<Selector options={OPTIONS} value="" onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'ban' } });
    expect(screen.getByText('Banana')).toBeInTheDocument();
    expect(screen.queryByText('Apple')).not.toBeInTheDocument();
  });

});
