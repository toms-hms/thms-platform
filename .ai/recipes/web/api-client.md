---
name: web-api-client
description: Guide for frontend query and mutation helpers — file structure, buildUrl for query params, and mutation patterns.
---

# Web API Client

API calls live in `queries.ts` (reads) and `mutations.ts` (writes) colocated with the component or page that uses them. All calls go through `request` from `@/lib/api`.

## File structure

```
src/app/(dashboard)/{route}/
  queries.ts    — GET helpers
  mutations.ts  — POST, PATCH, DELETE helpers

src/components/{module}/
  queries.ts
  mutations.ts
```

## The `request` helper

All API calls go through `src/lib/api.ts`'s `request<T>()`:

```typescript
export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    if (res.status === 401) { /* clear token, redirect to /login */ }
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body?.error?.message ?? `HTTP ${res.status}`, res.status, body?.error?.code);
  }
  return res.json();
}
```

## Building query strings — `buildUrl`

Use `buildUrl` from `@/lib/api` instead of manually constructing `URLSearchParams`. It handles string fields, array fields (appended as repeated keys), and omits undefined values:

```typescript
// src/lib/api.ts
export function buildUrl(
  path: string,
  params?: Record<string, string | string[] | undefined>,
): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined) continue;
    if (Array.isArray(value)) value.forEach((v) => qs.append(key, v));
    else qs.set(key, value);
  }
  const query = qs.toString();
  return query ? `${path}?${query}` : path;
}
```

## Queries

```typescript
// app/(dashboard)/contractors/queries.ts
import { request, buildUrl } from '@/lib/api';
import type { ContractorDto } from '@thms/shared';

export function listContractors(params?: {
  search?: string;
  tradeCategories?: string[];
  zipCodes?: string[];
}) {
  return request<{ data: ContractorDto[] }>(buildUrl('/api/v1/contractors', params));
}

export function getContractor(contractorId: string) {
  return request<{ data: ContractorDto }>(`/api/v1/contractors/${contractorId}`);
}
```

Always type the return with the DTO from `@thms/shared`. Never use `any`.

## Mutations

```typescript
// app/(dashboard)/homes/mutations.ts
import { request } from '@/lib/api';
import type { HomeDto, CreateHomeInput, UpdateHomeInput } from '@thms/shared';

export function createHome(data: CreateHomeInput) {
  return request<{ data: HomeDto }>('/api/v1/homes', { method: 'POST', body: JSON.stringify(data) });
}

export function updateHome(homeId: string, data: UpdateHomeInput) {
  return request<{ data: HomeDto }>(`/api/v1/homes/${homeId}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteHome(homeId: string) {
  return request(`/api/v1/homes/${homeId}`, { method: 'DELETE' });
}
```

## List filter rules

- Use plural array fields for filters that can hold multiple values.
- Do not add singular helper params as aliases for plural API params.
- Use domain-explicit names: `tradeCategories` not `categories`.
- If the UI has one selected value, wrap it in a one-item array before calling:

```typescript
listContractors({
  tradeCategories: selectedCategory ? [selectedCategory] : undefined,
  zipCodes: zip.trim() ? [zip.trim()] : undefined,
});
```

## No hidden lookups

Do not pass convenience IDs to collection endpoints so the backend can infer filters. Load explicit values and pass them directly.

```typescript
// Bad: backend infers zip and category from jobId
listContractors({ jobId: 'job_123' });

// Good: frontend loads the values and passes them explicitly
const job = await getJob(jobId);
listContractors({
  zipCodes: [home.zipCode],
  tradeCategories: job.aiSession?.confirmedCategories,
});
```
