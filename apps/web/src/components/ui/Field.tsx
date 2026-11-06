'use client';
import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';
import { useFormContext } from 'react-hook-form';

export const LABEL_CLASSES = 'block text-sm font-medium text-gray-700 mb-1';

interface FieldProps {
  /** The control: an `Input`, `Textarea`, `Select` or `Selector`. It receives the generated `id`. */
  children: ReactNode;
  className?: string;
  /** An error to show under the control. Inside a `Form`, `name` fills this in from validation. */
  error?: string;
  hint?: ReactNode;
  label: ReactNode;
  /** The react-hook-form field name; inside a `Form`, its validation error is shown under the control. */
  name?: string;
}

/** A labelled form control. Links the label to the control, and shows a hint or an error under it. */
export default function Field({ children, className, error, hint, label, name }: FieldProps) {
  const generatedId = useId();
  const form = useFormContext();
  const fieldError = name && form ? form.getFieldState(name, form.formState).error?.message : undefined;
  const shownError = error ?? fieldError;
  const child = isValidElement(children) ? (children as ReactElement<{ id?: string }>) : null;
  const id = child?.props.id ?? generatedId;
  return (
    <div className={className}>
      <label className={LABEL_CLASSES} htmlFor={child ? id : undefined}>
        {label}
      </label>
      {child ? cloneElement(child, { id }) : children}
      {hint && !shownError && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      {shownError && <p className="mt-1 text-xs text-red-600">{shownError}</p>}
    </div>
  );
}
