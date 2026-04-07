'use client';
import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/api';
import { saveTokens, saveUser } from '@/lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await auth.register(form);
      saveTokens(res.data.tokens.accessToken, res.data.tokens.refreshToken);
      saveUser(res.data.user);
      router.push('/homes');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-8">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
        <p className="text-sm text-gray-500 mt-1">Start managing your home projects</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">First name</label>
            <input
              type="text"
              value={form.firstName}
              onChange={(e) => update('firstName', e.target.value)}
              className="input"
              placeholder="Jane"
              required
            />
          </div>
          <div>
            <label className="label">Last name</label>
            <input
              type="text"
              value={form.lastName}
              onChange={(e) => update('lastName', e.target.value)}
              className="input"
              placeholder="Smith"
              required
            />
          </div>
        </div>
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            className="input"
            placeholder="you@example.com"
            required
          />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            className="input"
            placeholder="At least 8 characters"
            minLength={8}
            required
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link href="/login" className="text-brand-600 hover:text-brand-700 font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
