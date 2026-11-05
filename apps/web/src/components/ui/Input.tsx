import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/** Class names shared by every text control (`Input`, `Textarea`, `Select`). */
export const CONTROL_CLASSES =
  'block w-full rounded-md border border-gray-200 px-3 py-2 text-sm placeholder-gray-400 ' +
  'focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500';

/** A styled `<input>`. Pass `type` as usual; put it in a `Field` to give it a label. */
const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref
) {
  return <input className={cn(CONTROL_CLASSES, className)} ref={ref} {...props} />;
});

export default Input;
