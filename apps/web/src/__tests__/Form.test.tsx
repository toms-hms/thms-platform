import { zodResolver } from '@hookform/resolvers/zod';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import Field from '@/components/ui/Field';
import Form from '@/components/ui/Form';
import Input from '@/components/ui/Input';
import SubmitButton from '@/components/ui/SubmitButton';
import { requiredText } from '@/lib/formFields';

const schema = z.object({ title: requiredText('Give it a title') });

function TitleForm({ onSubmit }: { onSubmit: (values: { title: string }) => Promise<void> }) {
  const form = useForm({ defaultValues: { title: '' }, resolver: zodResolver(schema) });
  return (
    <Form form={form} onSubmit={onSubmit}>
      <Field label="Title" name="title">
        <Input {...form.register('title')} />
      </Field>
      <SubmitButton>Save</SubmitButton>
    </Form>
  );
}

describe('Form', () => {
  it('shows the validation message under the field and does not submit', async () => {
    const onSubmit = jest.fn();
    render(<TitleForm onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Give it a title')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the validated values', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<TitleForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText('Title'), '  Fix the sink  ');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenCalledWith({ title: 'Fix the sink' });
  });

  it('shows an error thrown by onSubmit above the fields', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('Email already registered'));
    render(<TitleForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText('Title'), 'Anything');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Email already registered');
  });
});
