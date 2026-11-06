'use client';
import { useState, FormEvent } from 'react';
import Link from '@/components/ui/Link';
import { useRouter } from 'next/navigation';
import { useMutation } from '@apollo/client/react';
import { saveTokens, saveUser } from '@/lib/auth';
import { LoginDocument } from './mutations/__generated__/Login.generated';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [login] = useMutation(LoginDocument);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await login({ variables: { email, password } });
      const auth = data?.login;
      if (!auth?.tokens || !auth.user) throw new Error('Login failed');
      saveTokens(auth.tokens.accessToken, auth.tokens.refreshToken);
      saveUser(auth.user);
      router.push('/homes');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-8">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Sign in to THMS</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your home projects</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <Field label="Email">
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </Field>
        <Field label="Password">
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </Field>
        <Button variant="primary" type="submit" disabled={loading} className="w-full">
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        Don&apos;t have an account?{' '}
        <Link variant="brand" href="/register">
          Sign up
        </Link>
      </p>
    </Card>
  );
}
