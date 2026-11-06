'use client';
import { Controller, useFormContext } from 'react-hook-form';
import Selector, { type SelectorOption } from './Selector';

interface FormSelectorProps {
  /** The react-hook-form field name; the field holds the selected option's `value`. */
  name: string;
  options: SelectorOption[];
  placeholder?: string;
}

/** A `Selector` bound to a field of the enclosing `Form`. Put it in a `Field` with the same `name`. */
export default function FormSelector({ name, options, placeholder }: FormSelectorProps) {
  const { control } = useFormContext();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Selector onChange={field.onChange} options={options} placeholder={placeholder} value={field.value ?? ''} />
      )}
    />
  );
}
