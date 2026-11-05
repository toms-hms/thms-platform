import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import Link from './Link';

interface PageHeaderProps {
  /** Buttons or links shown on the right. */
  actions?: ReactNode;
  /** A link back to the parent page, shown above the title. */
  back?: { href: string; label: string };
  className?: string;
  /** A line under the title, e.g. an address. */
  subtitle?: ReactNode;
  title: ReactNode;
}

/** The title row at the top of a page: optional back link, title, subtitle and actions. */
export default function PageHeader({ actions, back, className, subtitle, title }: PageHeaderProps) {
  return (
    <div className={cn('mb-6', className)}>
      {back && (
        <Link href={back.href} variant="subtle">
          ← {back.label}
        </Link>
      )}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className={cn('text-2xl font-bold text-gray-900', back && 'mt-1')}>{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
