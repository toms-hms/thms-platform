'use client';
import { useMutation } from '@apollo/client/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import Card from '@/components/ui/Card';
import Field from '@/components/ui/Field';
import Form from '@/components/ui/Form';
import Input from '@/components/ui/Input';
import Link from '@/components/ui/Link';
import SubmitButton from '@/components/ui/SubmitButton';
import { saveTokens, saveUser } from '@/lib/auth';
import { RegisterDocument } from './mutations/__generated__/Register.generated';

const schema = z.object({
  email: z.email('Enter a valid email address'),
  firstName: z.string().trim().min(1, 'Enter your first name'),
  lastName: z.string().trim().min(1, 'Enter your last name'),
  password: z.string().min(8, 'Use at least 8 characters'),
});

/** Create an account, then go straight to the homes page. */
export default function RegisterPage() {
  const router = useRouter();
  const [register] = useMutation(RegisterDocument);
  const form = useForm({
    defaultValues: { email: '', firstName: '', lastName: '', password: '' },
    resolver: zodResolver(schema),
  });

  async function handleSubmit(values: z.infer<typeof schema>) {
    const { data } = await register({ variables: values });
    const auth = data?.register;
    if (!auth?.tokens || !auth.user) throw new Error('Registration failed');
    saveTokens(auth.tokens.accessToken, auth.tokens.refreshToken);
    saveUser(auth.user);
    router.push('/homes');
  }

  return (
    <Card className="p-8">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
        <p className="text-sm text-gray-500 mt-1">Start managing your home projects</p>
      </div>

      <Form form={form} onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="First name" name="firstName">
            <Input placeholder="Jane" type="text" {...form.register('firstName')} />
          </Field>
          <Field label="Last name" name="lastName">
            <Input placeholder="Smith" type="text" {...form.register('lastName')} />
          </Field>
        </div>
        <Field label="Email" name="email">
          <Input placeholder="you@example.com" type="email" {...form.register('email')} />
        </Field>
        <Field label="Password" name="password">
          <Input placeholder="At least 8 characters" type="password" {...form.register('password')} />
        </Field>
        <SubmitButton className="w-full" submittingText="Creating account...">
          Create account
        </SubmitButton>
      </Form>

      <p className="mt-4 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link href="/login" variant="brand">
          Sign in
        </Link>
      </p>
    </Card>
  );
}
