import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';

export const LABEL_CLASSES = 'block text-sm font-medium text-gray-700 mb-1';

interface FieldProps {
  /** The control: an `Input`, `Textarea`, `Select` or `Selector`. It receives the generated `id`. */
  children: ReactNode;
  className?: string;
  error?: string;
  hint?: ReactNode;
  label: ReactNode;
}

/** A labelled form control. Links the label to the control, and shows a hint or an error under it. */
export default function Field({ children, className, error, hint, label }: FieldProps) {
  const generatedId = useId();
  const child = isValidElement(children) ? (children as ReactElement<{ id?: string }>) : null;
  const id = child?.props.id ?? generatedId;
  return (
    <div className={className}>
      <label className={LABEL_CLASSES} htmlFor={child ? id : undefined}>
        {label}
      </label>
      {child ? cloneElement(child, { id }) : children}
      {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
