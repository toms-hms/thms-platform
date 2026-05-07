# Web

Next.js 14 App Router + Tailwind CSS.

## Structure
```
src/app/(auth)/          Login + register (no nav)
src/app/(dashboard)/     Protected pages (Navbar, auth redirect)
src/components/ui/       Modal, StatusBadge, EmptyState, Navbar
src/lib/api.ts           All API calls (fetch wrapper)
src/lib/auth.ts          Token helpers (localStorage)
```

## Non-obvious patterns
- All pages are `'use client'` — data fetching via `api.ts` in `useEffect`
- Tailwind utilities: `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.input`, `.card`, `.badge`
- Token stored in `localStorage` — no auto-refresh on 401 yet
- Image uploads: get pre-signed URL → PUT to MinIO → confirm with API
