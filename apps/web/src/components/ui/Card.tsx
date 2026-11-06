import type { HTMLAttributes } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/cn';

/** Class names for a card surface, shared with card-styled links (`<Link variant="card">`). */
export const cardVariants = cva('bg-white rounded-lg border border-gray-200 shadow-sm');

/** A white bordered surface. Add padding and layout with `className`. */
export default function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(cardVariants(), className)} {...props} />;
}
