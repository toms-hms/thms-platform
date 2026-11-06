import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/** The row of buttons at the bottom of a form, right-aligned. */
export default function FormActions({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center gap-3 justify-end', className)} {...props} />;
}
