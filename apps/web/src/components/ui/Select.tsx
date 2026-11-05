import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { CONTROL_CLASSES } from './Input';

/** A styled native `<select>`; pass `<option>`s as children. For a searchable list use `Selector`. */
const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, ...props },
  ref
) {
  return <select className={cn(CONTROL_CLASSES, className)} ref={ref} {...props} />;
});

export default Select;
