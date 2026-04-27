'use client';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { auth } from '@/lib/api';
import { clearTokens, getStoredUser } from '@/lib/auth';
import { useState, useEffect } from 'react';

const navLinks = [
  { href: '/homes', label: 'Homes' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/contractors', label: 'Contractors' },
  { href: '/integrations', label: 'Integrations' },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await auth.logout();
    } catch {}
    clearTokens();
    router.push('/login');
  }

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/homes" className="text-lg font-bold text-brand-700">
              THMS
            </Link>
            <div className="flex items-center gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition-colors ${
                    pathname.startsWith(link.href)
                      ? 'text-brand-700'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <span className="text-sm text-gray-600">
                {user.firstName} {user.lastName}
              </span>
            )}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
