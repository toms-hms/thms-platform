# Web

Next.js 14 App Router + Tailwind CSS.

## Structure
```
src/app/(auth)/          Login + register (no nav)
src/app/(dashboard)/     Protected pages (Navbar, auth redirect)
src/components/ui/       Modal, StatusBadge, EmptyState, Navbar
src/lib/graphql.ts       The GraphQL client — every API call goes through gqlRequest
src/lib/auth-api.ts      Auth operations (login, register, logout, me)
src/lib/auth.ts          Token helpers (localStorage)
src/types/api.ts         Types mirroring the GraphQL schema — the app's only API contract
```

Reads live in `queries.ts` and writes in `mutations.ts`, colocated with the page or
component that uses them. Both return `{ data }` so callers read `res.data`.

## Non-obvious patterns
- All pages are `'use client'` — data fetching via the colocated `queries.ts` in `useEffect`
- The API is GraphQL: one `POST /graphql`, operations built as documents with variables
- Errors arrive as `ApiError` with a `code` (`FORBIDDEN`, `NOT_FOUND`, …); `UNAUTHORIZED` clears the session and redirects to `/login`
- `JSONString` fields (`aiSession`, `metadata`) are strings on the wire — parse in, stringify out
- No imports from `apps/api`: types are declared in `src/types/api.ts` and updated alongside the schema
- Tailwind utilities: `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.input`, `.card`, `.badge`
- Token stored in `localStorage` — no auto-refresh on 401 yet
- Image uploads: get pre-signed URL → PUT to MinIO → confirm with API
