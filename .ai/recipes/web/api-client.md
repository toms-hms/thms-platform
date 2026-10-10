---
name: web-api-client
description: Guide for frontend query and mutation helpers — the GraphQL client, where operations live, and how results are shaped.
---

# Web API Client

The API is GraphQL. Every call goes through `gqlRequest` from `@/lib/graphql`, in a `queries.ts` (reads) or `mutations.ts` (writes) file colocated with the page or component that uses it.

```
src/app/(dashboard)/{route}/
  queries.ts    reads
  mutations.ts  writes

src/components/{module}/
  queries.ts
  mutations.ts
```

Authentication operations are the exception: they live in `src/lib/auth-api.ts`, because the login page, the register page and the navbar all need them.

## `gqlRequest`

```typescript
export async function gqlRequest<T>(query: string, variables?: Record<string, unknown>): Promise<T>
```

It attaches the stored bearer token, posts to `/graphql`, and throws `ApiError` carrying the server's `code` when the response contains errors. A rejected token (`UNAUTHORIZED`) clears the session and redirects to `/login`.

## Helpers return `{ data }`

Every helper unwraps the operation and returns `{ data: T }`, so a caller reads `res.data` regardless of which operation it used:

```typescript
/** Returns all homes the current user has access to. */
export async function listHomes(): Promise<{ data: HomeDto[] }> {
  const data = await gqlRequest<{ homes: HomeDto[] }>(`query { homes { ${HOME_FIELDS} } }`);
  return { data: data.homes };
}
```

## Field lists are shared constants

Export the selection set and reuse it, so a type's fields are defined once:

```typescript
export const HOME_FIELDS = `
  id name address1 address2 city state zipCode country notes fullAddress createdAt updatedAt
`;
```

Import it across files (`import { CONTRACTOR_FIELDS } from '../contractors/queries'`) rather than retyping the selection.

## Variables, never interpolation

```typescript
// Good — the value travels as a variable
gqlRequest(`query GetHome($homeId: ID!) { home(homeId: $homeId) { ${HOME_FIELDS} } }`, { homeId });

// Bad — string-built query
gqlRequest(`query { home(homeId: "${homeId}") { id } }`);
```

Only field selections are interpolated. Every value is a variable, typed in the operation signature.

## Types

Types come from `@/types/api`, which mirrors the server schema. The web app does not import from the API — they deploy separately (see `.ai/rules/core.md`). When the schema changes, update `@/types/api` in the same change.

`JSONString` fields (`aiSession`, `metadata`) arrive as strings: `JSON.parse` on the way in, `JSON.stringify` on the way out.

## List filter rules

- Plural array fields for filters that can hold several values.
- No singular aliases for convenience.
- Domain-explicit names: `tradeCategories`, not `categories`.
- One selected value is still an array:

```typescript
listContractors({
  tradeCategories: selectedCategory ? [selectedCategory] : undefined,
  zipCodes: zip.trim() ? [zip.trim()] : undefined,
});
```

## No hidden lookups

Do not pass a convenience id so the backend can infer filters. Load the values and pass them:

```typescript
// Bad
listContractors({ jobId: 'job_123' });

// Good
const job = await getJob(jobId);
listContractors({ zipCodes: [home.zipCode], tradeCategories: job.aiSession?.confirmedCategories });
```
