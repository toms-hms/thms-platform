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
import { LoginDocument } from './mutations/__generated__/Login.generated';

const schema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

/** Sign in with email and password. */
export default function LoginPage() {
  const router = useRouter();
  const [login] = useMutation(LoginDocument);
  const form = useForm({ defaultValues: { email: '', password: '' }, resolver: zodResolver(schema) });

  async function handleSubmit(values: z.infer<typeof schema>) {
    const { data } = await login({ variables: values });
    const auth = data?.login;
    if (!auth?.tokens || !auth.user) throw new Error('Login failed');
    saveTokens(auth.tokens.accessToken, auth.tokens.refreshToken);
    saveUser(auth.user);
    router.push('/homes');
  }

  return (
    <Card className="p-8">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Sign in to THMS</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your home projects</p>
      </div>

      <Form form={form} onSubmit={handleSubmit}>
        <Field label="Email" name="email">
          <Input placeholder="you@example.com" type="email" {...form.register('email')} />
        </Field>
        <Field label="Password" name="password">
          <Input placeholder="••••••••" type="password" {...form.register('password')} />
        </Field>
        <SubmitButton className="w-full" submittingText="Signing in...">
          Sign in
        </SubmitButton>
      </Form>

      <p className="mt-4 text-center text-sm text-gray-600">
        Don&apos;t have an account?{' '}
        <Link href="/register" variant="brand">
          Sign up
        </Link>
      </p>
    </Card>
  );
}
