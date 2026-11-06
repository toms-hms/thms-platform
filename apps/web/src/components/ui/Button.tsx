import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const SOLID =
  'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors ' +
  'focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

/** Class names for a button, shared with button-styled links (`<Link variant="primary">`). */
export const buttonVariants = cva('', {
  variants: {
    variant: {
      primary: `${SOLID} bg-brand-600 text-white hover:bg-brand-700 focus:ring-brand-500`,
      secondary: `${SOLID} bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 focus:ring-brand-500`,
      danger: `${SOLID} bg-red-600 text-white hover:bg-red-700 focus:ring-red-500`,
      /** A text-only action, e.g. "Cancel" or "← Back". */
      muted: 'text-sm text-gray-500 hover:text-gray-700',
      /** No styling of its own: for bespoke controls (tabs, option cards, icon buttons) styled by `className`. */
      bare: '',
    },
    size: {
      md: '',
      sm: 'px-2 py-1 text-xs',
    },
  },
  defaultVariants: { size: 'md', variant: 'primary' },
});

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Disables the button and shows `loadingText` (or the children) while an action runs. */
  loading?: boolean;
  loadingText?: string;
}

/** The app's button. Defaults to `type="button"` so it never submits a form by accident. */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { children, className, disabled, loading, loadingText, size, type = 'button', variant, ...props },
  ref
) {
  return (
    <button
      className={cn(buttonVariants({ size, variant }), className)}
      disabled={disabled || loading}
      ref={ref}
      type={type}
      {...props}
    >
      {loading && loadingText ? loadingText : children}
    </button>
  );
});

export default Button;
