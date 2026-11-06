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

});
