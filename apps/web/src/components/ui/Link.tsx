import NextLink from 'next/link';
import { forwardRef, type ComponentProps } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';
import { buttonVariants } from './Button';
import { cardVariants } from './Card';

const linkVariants = cva('', {
  variants: {
    variant: {
      /** No styling of its own; style with `className`. */
      plain: '',
      /** Brand-coloured inline link. */
      brand: 'text-brand-600 hover:text-brand-700 font-medium',
      /** Grey text link, e.g. "← Back to Home". */
      muted: 'text-sm text-gray-500 hover:text-gray-700',
      /** Lighter grey breadcrumb-style link. */
      subtle: 'text-sm text-gray-400 hover:text-gray-600 transition-colors',
      /** A whole card that links somewhere; add padding and layout with `className`. */
      card: cn(cardVariants(), 'block hover:shadow-md transition-shadow'),
      primary: buttonVariants({ variant: 'primary' }),
      secondary: buttonVariants({ variant: 'secondary' }),
    },
  },
  defaultVariants: { variant: 'plain' },
});

export type LinkProps = ComponentProps<typeof NextLink> & VariantProps<typeof linkVariants>;

/** The app's link: Next's client-side `Link` with the shared link and button styles. */
const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link({ className, variant, ...props }, ref) {
  return <NextLink className={cn(linkVariants({ variant }), className)} ref={ref} {...props} />;
});

export default Link;
