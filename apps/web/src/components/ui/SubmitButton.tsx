'use client';
import { useFormContext } from 'react-hook-form';
import Button, { type ButtonProps } from './Button';

interface SubmitButtonProps extends Omit<ButtonProps, 'loading' | 'type'> {
  /** Shown while the form is submitting, e.g. "Saving…". */
  submittingText?: string;
}

/** A form's submit button. Disabled, with `submittingText`, while the enclosing `Form` submits. */
export default function SubmitButton({ children, submittingText, ...props }: SubmitButtonProps) {
  const { formState } = useFormContext();
  return (
    <Button loading={formState.isSubmitting} loadingText={submittingText} type="submit" variant="primary" {...props}>
      {children}
    </Button>
  );
}
