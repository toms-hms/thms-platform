import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/** Class names for a badge, for a control that must look like one (e.g. a toggle chip). */
export const BADGE_CLASSES = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium';

/** A small rounded pill. Colour it with `className`; `StatusBadge` maps statuses onto it. */
export default function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn(BADGE_CLASSES, className)} {...props} />;
}
