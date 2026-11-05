# Web

Next.js 14 App Router + Tailwind CSS.

## Structure
```
src/app/(auth)/          Login + register (no nav)
src/app/(dashboard)/     Protected pages (Navbar, auth redirect)
src/components/ui/       Modal, StatusBadge, EmptyState, Navbar
src/components/ApolloWrapper.tsx   Provides the Apollo client (wraps the root layout)
src/lib/apollo.ts        Apollo client + link chain (bearer token, session end on UNAUTHORIZED), errorCode()
src/lib/auth.ts          Token helpers (localStorage)
src/graphql/types.generated.ts     Schema enums and input types (codegen)
src/types/api.ts         Only what the schema leaves untyped: AI-session JSON shapes, UserRole
codegen.ts               GraphQL codegen config; schema is ../api/schema.graphql
```

Every operation is one `.graphql` file in a `queries/` or `mutations/` folder beside the page
or component that uses it, selecting only what that file renders. Codegen writes
`__generated__/<Operation>.generated.ts` in that folder with a typed document for
`useQuery` / `useMutation`. See
`.ai/recipes/web/api-client.md`.

## Non-obvious patterns
- All pages are `'use client'` — data loads with Apollo `useQuery`; writes with `useMutation`
- The API is GraphQL: one `POST /graphql`. Edit a `.graphql` file → `npm run codegen`; generated files are committed
- A failed operation throws an Apollo error whose message is the server's; `errorCode(err)` gives `FORBIDDEN`, `NOT_FOUND`, …; `UNAUTHORIZED` clears the session and redirects to `/login`
- `JSONString` fields (`aiSession`, `metadata`) are strings on the wire — parse in, stringify out
- No imports from `apps/api`: types are generated from the checked-in `apps/api/schema.graphql` (`make graphql-schema`)
- Tailwind utilities: `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.input`, `.card`, `.badge`
- Token stored in `localStorage` — no auto-refresh on 401 yet
- Image uploads: get pre-signed URL → PUT to MinIO → confirm with API
