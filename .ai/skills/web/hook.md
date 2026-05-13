---
name: web-hook
description: Guide for writing custom React hooks — placement, 'use client' requirement, and the useRequireAuth pattern.
---

# Web Hook

Custom hooks that encapsulate stateful logic or side effects live in `src/hooks/`.

## File location

```
src/hooks/
  useAuth.ts         — auth guard hook
  useXxx.ts          — one file per hook
```

## Rules

- The file (or the hook function) must have `'use client'` at the top — hooks use browser APIs (`useEffect`, `useRouter`, `localStorage`).
- Hook names must start with `use`.
- Hooks that call `localStorage` or `useRouter` can only run in a client component.

## Pattern — `useRequireAuth`

The only current hook. Guards a page: if the user is not authenticated, redirects to `/login`.

```typescript
// apps/web/src/hooks/useAuth.ts
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';

/** Redirects to /login if no access token is present in localStorage. */
export function useRequireAuth() {
  const router = useRouter();
  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
    }
  }, [router]);
}
```

Usage in a page:
```typescript
'use client';
import { useRequireAuth } from '@/hooks/useAuth';

export default function SettingsPage() {
  useRequireAuth();
  // ...
}
```

Note: `(dashboard)/layout.tsx` already handles the auth redirect for all dashboard pages. Only add `useRequireAuth` to pages outside that layout.

## Pattern — data-fetching hook

When the same fetch-and-state pattern repeats across multiple pages, extract it:

```typescript
// src/hooks/useContractors.ts
'use client';
import { useState, useEffect } from 'react';
import { listContractors } from '@/app/(dashboard)/contractors/queries';

interface UseContractorsOpts {
  search?: string;
  tradeCategories?: string[];
  zipCodes?: string[];
}

/** Fetches the contractor list and re-runs when filter values change. */
export function useContractors({ search, tradeCategories, zipCodes }: UseContractorsOpts = {}) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listContractors({ search, tradeCategories, zipCodes })
      .then((res) => { if (!cancelled) { setData(res.data); setLoading(false); } })
      .catch((err) => { if (!cancelled) { setError(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [search, JSON.stringify(tradeCategories), JSON.stringify(zipCodes)]);

  return { data, loading, error };
}
```

Only extract a hook when the logic is genuinely reused. A single page's `useEffect` fetch does not need to become a hook.
