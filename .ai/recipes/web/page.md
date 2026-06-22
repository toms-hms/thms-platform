---
name: web-page
description: Guide for creating Next.js App Router dashboard pages — 'use client', queries/mutations split, useEffect data loading, and UI patterns.
---

# Web Page (Next.js App Router)

All dashboard pages live under `src/app/(dashboard)/`. They are client components that fetch data via `api.ts` in `useEffect`.

## File layout

```
src/app/(dashboard)/{route}/
  page.tsx        — the page component ('use client')
  queries.ts      — read-only API calls (GET)
  mutations.ts    — write API calls (POST, PATCH, DELETE)
  _components/    — page-local components (not shared)
    SomeSubForm.tsx
```

## Steps to add a new page

1. Create `src/app/(dashboard)/{route}/page.tsx` with `'use client'` at the top.
2. Create `queries.ts` and `mutations.ts` for the API calls.
3. Use `useState` + `useEffect` to load data; show a loading state while fetching.
4. Use `<Modal>` for create/edit forms, `<EmptyState>` for empty lists.
5. Add a nav link to `src/components/ui/Navbar.tsx` for top-level routes.

## Realistic example — contractors page

```typescript
// apps/web/src/app/(dashboard)/contractors/page.tsx
'use client';
import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { TradeCategory, UserRole } from '@thms/shared';
import { useRouter } from 'next/navigation';
import { listContractors } from './queries';
import { createContractor, updateContractor, deleteContractor } from './mutations';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import Selector, { SelectorOption } from '@/components/ui/Selector';
import { getStoredUser } from '@/lib/auth';

const CATEGORY_OPTIONS: SelectorOption[] = Object.values(TradeCategory).map((v) => ({
  value: v,
  label: v.replace(/_/g, ' '),
}));

type Contractor = {
  id: string;
  name: string;
  companyName?: string | null;
  email?: string | null;
  categories: TradeCategory[];
  zipCodes: string[];
};

export default function ContractorsPage() {
  const isAdmin = getStoredUser()?.role === UserRole.ADMIN;
  const [list, setList] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTradeCategory, setSelectedTradeCategory] = useState('');
  const [zipFilter, setZipFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', companyName: '', email: '', phone: '', category: '', zipCodes: '', notes: '',
  });

  // Reload whenever filter values change
  useEffect(() => { load(); }, [search, selectedTradeCategory, zipFilter]);

  async function load() {
    setLoading(true);
    try {
      const res = await listContractors({
        search: search || undefined,
        tradeCategories: selectedTradeCategory ? [selectedTradeCategory] : undefined,
        zipCodes: zipFilter.trim() ? [zipFilter.trim()] : undefined,
      });
      setList(res.data);
    } catch {}
    setLoading(false);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await createContractor({
        name: form.name,
        companyName: form.companyName || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        categories: form.category ? [form.category] : [],
        zipCodes: form.zipCodes ? form.zipCodes.split(',').map((z) => z.trim()) : [],
        notes: form.notes || undefined,
      });
      setShowCreate(false);
      load();
    } catch (err: any) {
      setError(err.message ?? 'Failed to save');
    }
  }

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-bold">Contractors</h1>
        {isAdmin && (
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            Add Contractor
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <input
          className="input"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Selector
          options={[{ value: '', label: 'All categories' }, ...CATEGORY_OPTIONS]}
          value={selectedTradeCategory}
          onChange={setSelectedTradeCategory}
        />
        <input
          className="input"
          placeholder="ZIP code"
          value={zipFilter}
          onChange={(e) => setZipFilter(e.target.value)}
        />
      </div>

      {list.length === 0 ? (
        <EmptyState message="No contractors found" />
      ) : (
        <div className="grid gap-4">
          {list.map((c) => (
            <div key={c.id} className="card">
              <Link href={`/contractors/${c.id}`} className="font-semibold">{c.name}</Link>
              {c.companyName && <p className="text-sm text-gray-500">{c.companyName}</p>}
            </div>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Contractor">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <input className="input w-full" placeholder="Name *" value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          {/* ... other fields ... */}
          <button type="submit" className="btn-primary w-full">Save</button>
        </form>
      </Modal>
    </div>
  );
}
```

## queries.ts pattern

```typescript
// apps/web/src/app/(dashboard)/contractors/queries.ts
import { request } from '@/lib/api';

export function listContractors(params?: {
  search?: string;
  tradeCategories?: string[];
  zipCodes?: string[];
}) {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  params?.tradeCategories?.forEach((v) => qs.append('tradeCategories', v));
  params?.zipCodes?.forEach((v) => qs.append('zipCodes', v));
  return request<{ data: any[] }>(`/api/v1/contractors${qs.toString() ? `?${qs}` : ''}`);
}

export function getContractor(id: string) {
  return request<{ data: any }>(`/api/v1/contractors/${id}`);
}
```

## mutations.ts pattern

```typescript
// apps/web/src/app/(dashboard)/contractors/mutations.ts
import { request } from '@/lib/api';

export function createContractor(data: any) {
  return request<{ data: any }>('/api/v1/contractors', { method: 'POST', body: JSON.stringify(data) });
}

export function updateContractor(id: string, data: any) {
  return request<{ data: any }>(`/api/v1/contractors/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteContractor(id: string) {
  return request(`/api/v1/contractors/${id}`, { method: 'DELETE' });
}
```

## Tailwind utility classes

Use these globals from `globals.css` (do not write your own base button/input styles):

| Class | Use |
|---|---|
| `.btn-primary` | Primary action button |
| `.btn-secondary` | Secondary action |
| `.btn-danger` | Destructive action |
| `.input` | Text/select inputs |
| `.card` | Surface container |
| `.badge` | Status chip |

## Key rules

- All dashboard pages are `'use client'` — no server components in `(dashboard)/`.
- Import across directory boundaries with `@/`, same-directory with `./`.
- Enums come from `@thms/shared` — never import from `apps/api`.
- Token is in `localStorage` — see `src/lib/auth.ts` for `getStoredUser()`.
