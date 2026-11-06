import type { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const alertVariants = cva('rounded-md border px-3 py-2 text-sm', {
  variants: {
    tone: {
      error: 'bg-red-50 border-red-200 text-red-700',
      info: 'bg-brand-50 border-brand-200 text-brand-800',
      warning: 'bg-amber-50 border-amber-200 text-amber-700',
    },
  },
  defaultVariants: { tone: 'error' },
});

export type AlertProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>;

/** A message box: a form's submit error, or a warning or note above some content. */
export default function Alert({ className, tone, ...props }: AlertProps) {
  return <div className={cn(alertVariants({ tone }), className)} role={tone === 'error' || !tone ? 'alert' : 'status'} {...props} />;
}
