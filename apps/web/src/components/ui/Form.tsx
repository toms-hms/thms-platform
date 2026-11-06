'use client';
import type { ReactNode } from 'react';
import { FormProvider, type FieldValues, type UseFormReturn } from 'react-hook-form';
import { cn } from '@/lib/cn';
import Alert from './Alert';

interface FormProps<TInput extends FieldValues, TOutput extends FieldValues> {
  children: ReactNode;
  className?: string;
  /** The `useForm` result, usually `useForm({ resolver: zodResolver(schema) })`. */
  form: UseFormReturn<TInput, unknown, TOutput>;
  /** Runs with the validated values (after the schema's transforms). Anything it throws is shown above the fields. */
  onSubmit: (values: TOutput) => Promise<unknown> | unknown;
}

/**
 * A form wired to react-hook-form: validates with the form's resolver, then runs `onSubmit`.
 * A thrown error (e.g. the API's message) becomes the form's root error, shown in an `Alert`;
 * `SubmitButton` reads the submitting state, so pages keep no `saving` or `error` state.
 */
export default function Form<TInput extends FieldValues, TOutput extends FieldValues = TInput>({
  children,
  className,
  form,
  onSubmit,
}: FormProps<TInput, TOutput>) {
  async function submit(values: TOutput) {
    form.clearErrors('root');
    try {
      await onSubmit(values);
    } catch (err) {
      form.setError('root', { message: err instanceof Error && err.message ? err.message : 'Something went wrong. Please try again.' });
    }
  }

  const rootError = form.formState.errors.root?.message;

  return (
    <FormProvider {...form}>
      <form className={cn('space-y-4', className)} noValidate onSubmit={form.handleSubmit(submit)}>
        {rootError && <Alert tone="error">{rootError}</Alert>}
        {children}
      </form>
    </FormProvider>
  );
}
