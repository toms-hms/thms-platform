import { render, screen } from '@testing-library/react';
import Button from '@/components/ui/Button';

describe('Button', () => {
  it('defaults to type="button" so it never submits a form by accident', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button');
  });

  it('keeps an explicit submit type', () => {
    render(<Button type="submit">Save</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('applies the variant and lets className override it', () => {
    render(
      <Button className="px-8" variant="danger">
        Delete
      </Button>
    );
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-red-600', 'px-8');
    expect(button).not.toHaveClass('px-4');
  });

  it('is disabled and shows the loading text while loading', () => {
    render(
      <Button loading loadingText="Saving...">
        Save
      </Button>
    );
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Saving...');
  });
});
