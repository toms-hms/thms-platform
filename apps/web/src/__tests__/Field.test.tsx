import { render, screen } from '@testing-library/react';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';

describe('Field', () => {
  it('links the label to the control', () => {
    render(
      <Field label="Title">
        <Input />
      </Field>
    );
    expect(screen.getByLabelText('Title')).toBeInstanceOf(HTMLInputElement);
  });

  it("keeps the control's own id", () => {
    render(
      <Field label="Email">
        <Input id="email" />
      </Field>
    );
    expect(screen.getByLabelText('Email')).toHaveAttribute('id', 'email');
  });

  it('shows the error instead of the hint', () => {
    render(
      <Field error="Required" hint="Your full name" label="Name">
        <Input />
      </Field>
    );
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(screen.queryByText('Your full name')).not.toBeInTheDocument();
  });
});
