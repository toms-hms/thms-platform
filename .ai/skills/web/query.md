---
name: web-query
description: Guide for frontend query helpers and API query parameter contracts — plural arrays, domain-explicit names, no singular aliases.
---

# Web Query Contracts

Query helpers in `apps/web` define the client-side API contract. Keep them explicit, typed, and aligned with backend route names.

## List filter rules

- Use plural array fields for filters that can hold multiple values.
- Do not add singular helper params as aliases for plural API params.
- Use domain-explicit names. Prefer `tradeCategories` over generic `categories` when values are `TradeCategory`.
- If the UI has one selected value, wrap it in a one-item array before calling the query helper.

```typescript
// queries.ts — good: plural params, domain-explicit names
export function listContractors(params?: {
  search?: string;
  tradeCategories?: string[];
  zipCodes?: string[];
}) {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  params?.tradeCategories?.forEach((value) => qs.append('tradeCategories', value));
  params?.zipCodes?.forEach((value) => qs.append('zipCodes', value));
  return request<{ data: any[] }>(`/api/v1/contractors${qs.toString() ? `?${qs}` : ''}`);
}

// page.tsx — calling with one selected value: wrap in array
listContractors({
  tradeCategories: selectedTradeCategory ? [selectedTradeCategory] : undefined,
  zipCodes: zipFilter.trim() ? [zipFilter.trim()] : undefined,
});
```

```typescript
// Bad: singular params, generic name
listContractors({ category, zipCode });
qs.set('category', category);
qs.set('zipCode', zipCode);
```

## The `request` helper

All API calls go through `src/lib/api.ts`'s `request<T>()`:

```typescript
export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken(); // reads localStorage
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

Always type the return: `request<{ data: ContractorDto[] }>()`. This is the only place `fetch` is called.

## No hidden lookups

Do not pass convenience IDs to collection endpoints so the backend can infer filters. If a workflow has a home ZIP or confirmed trade categories, the frontend loads those values explicitly and passes them as `zipCodes` and `tradeCategories`.

```typescript
// Bad: backend infers zip and category from the jobId
listContractors({ jobId: 'job_123' });

// Good: frontend loads the explicit values and passes them
const job = await getJob(jobId);
listContractors({
  zipCodes: [home.zipCode],
  tradeCategories: job.aiSession?.confirmedCategories,
});
```
