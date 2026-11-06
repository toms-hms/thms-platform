'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';

export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    if (isAuthenticated()) {
      router.replace('/homes');
    } else {
      router.replace('/login');
    }
  }, [router]);
  return null;
}
