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

## Data fetching is not a custom hook

Load data with Apollo's `useQuery` and a typed document directly in the component (see
`api-client.md`). It already handles loading state, errors, refetching on variable changes
and caching, so do not wrap it in a `useX` hook or hand-roll a `useEffect` fetch.

Only extract a hook for genuinely reused UI or derived logic, not for an API call.
