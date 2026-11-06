import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { CONTROL_CLASSES } from './Input';

/** A styled `<textarea>`. Put it in a `Field` to give it a label. */
const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...props },
  ref
) {
  return <textarea className={cn(CONTROL_CLASSES, className)} ref={ref} {...props} />;
});

export default Textarea;
