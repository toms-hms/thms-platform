---
name: web-page
description: Guide for creating Next.js App Router dashboard pages — 'use client', colocated .graphql operations loaded with Apollo useQuery/useMutation, and UI patterns.
---

# Web Page (Next.js App Router)

All dashboard pages live under `src/app/(dashboard)/`. They are client components that
load data with Apollo's `useQuery` and write with `useMutation`, using the typed
documents codegen generates from the `.graphql` files beside them.

## File layout

```
src/app/(dashboard)/{route}/
  page.tsx                      — the page component ('use client')
  {Operation}.graphql           — one query or mutation per file, owned by this page
  {Operation}.generated.ts      — written by `npm run codegen`; never edited
  _components/                  — page-local components (not shared)
    SomeSubForm.tsx
```

## Steps to add a new page

1. Create `src/app/(dashboard)/{route}/page.tsx` with `'use client'` at the top.
2. Write one `.graphql` file per operation the page runs, selecting only the fields it renders.
3. Run `npm run codegen` in `apps/web`.
4. Load with `useQuery(XDocument, { variables })`; show a loading state while `loading && !data`.
5. Write with `useMutation(YDocument)`; after a create or delete, `refetch()` the list.
6. Use `<Modal>` for create/edit forms, `<EmptyState>` for empty lists.
7. Add a nav link to `src/components/ui/Navbar.tsx` for top-level routes.

## Realistic example — contractors page

```graphql
# apps/web/src/app/(dashboard)/contractors/Contractors.graphql
query Contractors($search: String, $tradeCategories: [TradeCategory!], $zipCodes: [String!]) {
  contractors(search: $search, tradeCategories: $tradeCategories, zipCodes: $zipCodes) {
    id
    name
    companyName
  }
}
```

```graphql
# apps/web/src/app/(dashboard)/contractors/CreateContractor.graphql
mutation CreateContractor($name: String!, $categories: [TradeCategory!]!, $zipCodes: [String!]) {
  createContractor(name: $name, categories: $categories, zipCodes: $zipCodes) {
    contractor {
      id
    }
  }
}
```

```typescript
// apps/web/src/app/(dashboard)/contractors/page.tsx
'use client';
import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from '@apollo/client/react';
import { TradeCategory } from '@/graphql/types.generated';
import { UserRole } from '@/types/api';
import { ContractorsDocument } from './Contractors.generated';
import { CreateContractorDocument } from './CreateContractor.generated';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import { getStoredUser } from '@/lib/auth';

export default function ContractorsPage() {
  const isAdmin = getStoredUser()?.role === UserRole.ADMIN;
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', category: '', zipCodes: '' });

  // Re-runs whenever the variables change.
  const { data, loading: fetching, refetch } = useQuery(ContractorsDocument, {
    variables: {
      search: search || undefined,
      tradeCategories: category ? [category as TradeCategory] : undefined,
    },
  });
  const list = data?.contractors ?? [];
  const loading = fetching && !data;
  const [createContractor] = useMutation(CreateContractorDocument);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await createContractor({
        variables: {
          name: form.name,
          categories: form.category ? [form.category as TradeCategory] : [],
          zipCodes: form.zipCodes.split(',').map((z) => z.trim()).filter(Boolean),
        },
      });
      setShowCreate(false);
      await refetch();
    } catch (err: any) {
      setError(err.message ?? 'Failed to save');
    }
  }

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      {/* header, filters, list, and <Modal> create form */}
      {list.length === 0 ? (
        <EmptyState title="No contractors found" />
      ) : (
        list.map((c) => (
          <Link key={c.id} href={`/contractors/${c.id}`} className="card block">{c.name}</Link>
        ))
      )}
    </div>
  );
}
```

See `.ai/recipes/web/api-client.md` for the full client pattern: where operations live,
keeping the screen current after a write, and codegen.

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
- Schema enums come from `@/graphql/types.generated` — never import from `apps/api`.
- Token is in `localStorage` — see `src/lib/auth.ts` for `getStoredUser()`.
