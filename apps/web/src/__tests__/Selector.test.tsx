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
  it('shows placeholder when no value selected', () => {
    render(<Selector options={OPTIONS} value="" onChange={() => {}} placeholder="Pick one" />);
    expect(screen.getByText('Pick one')).toBeInTheDocument();
  });

  it('shows selected label', () => {
    render(<Selector options={OPTIONS} value="b" onChange={() => {}} />);
    expect(screen.getByText('Banana')).toBeInTheDocument();
  });

  it('opens on click and shows options', () => {
    render(<Selector options={OPTIONS} value="" onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByText('Banana')).toBeInTheDocument();
  });

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

  it('shows no results message when search finds nothing', () => {
    render(<Selector options={OPTIONS} value="" onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'zzz' } });
    expect(screen.getByText('No results')).toBeInTheDocument();
  });
});
