---
name: web-page
description: Guide for creating Next.js App Router dashboard pages — 'use client', .graphql operations in queries/ and mutations/ folders beside the page, loaded with Apollo useQuery/useMutation, and UI patterns.
---

# Web Page (Next.js App Router)

All dashboard pages live under `src/app/(dashboard)/`. They are client components that
load data with Apollo's `useQuery` and write with `useMutation`, using the typed
documents codegen generates from the `.graphql` files in their `queries/` and `mutations/` folders.

## File layout

```
src/app/(dashboard)/{route}/
  page.tsx                      — one line: export { default } from './{Name}Page';
  {Name}Page/
    index.ts                    — export { default } from './{Name}Page';
    {Name}Page.tsx              — the page component ('use client')
    queries/
      {Operation}.graphql       — one query per file, owned by this page
      __generated__/            — written by `npm run codegen`; never edited
    mutations/
      {Operation}.graphql       — one mutation per file
      __generated__/
    {Section}/                  — a section of the page, once it passes ~200 lines (see component.md)
      index.ts
      {Section}.tsx
      mutations/ …
```

## Steps to add a new page

1. Create `src/app/(dashboard)/{route}/{Name}Page/{Name}Page.tsx` (with `'use client'`), its `index.ts`, and a one-line `page.tsx` beside the folder that re-exports it.
2. Write one `.graphql` file per operation the page runs, in `queries/` or `mutations/`, selecting only the fields it renders.
3. Run `npm run codegen` in `apps/web`.
4. Load with `useQuery(XDocument, { variables })`; show a loading state while `loading && !data`.
5. Write with `useMutation(YDocument)`; after a create or delete, `refetch()` the list.
6. Use `<Modal>` for create/edit forms, `<EmptyState>` for empty lists.
7. Add a nav link to `src/components/ui/Navbar.tsx` for top-level routes.

## Realistic example — contractors page

```graphql
# apps/web/src/app/(dashboard)/contractors/queries/Contractors.graphql
query Contractors($search: String, $tradeCategories: [TradeCategory!], $zipCodes: [String!]) {
  contractors(search: $search, tradeCategories: $tradeCategories, zipCodes: $zipCodes) {
    id
    name
    companyName
  }
}
```

```graphql
# apps/web/src/app/(dashboard)/contractors/mutations/CreateContractor.graphql
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
import Link from '@/components/ui/Link';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import { useMutation, useQuery } from '@apollo/client/react';
import { TradeCategory } from '@/graphql/types.generated';
import { UserRole } from '@/types/api';
import { ContractorsDocument } from './queries/__generated__/Contractors.generated';
import { CreateContractorDocument } from './mutations/__generated__/CreateContractor.generated';
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
      <PageHeader
        actions={isAdmin && <Button onClick={() => setShowCreate(true)}>+ Add Contractor</Button>}
        title="Contractors"
      />
      {/* filters, then the list; the create form is a <Modal> of <Field>s */}
      {list.length === 0 ? (
        <EmptyState title="No contractors found" />
      ) : (
        list.map((c) => (
          <Link className="p-4" href={`/contractors/${c.id}`} key={c.id} variant="card">{c.name}</Link>
        ))
      )}
    </div>
  );
}
```

See `.ai/recipes/web/api-client.md` for the full client pattern: where operations live,
keeping the screen current after a write, and codegen.

## UI components

Build pages from `src/components/ui/` (`Button`, `Link`, `Field`, `Input`, `Select`, `Textarea`,
`Card`, `Badge`, `PageHeader`, `Modal`, `EmptyState`), never raw form elements or copied class
strings; `next lint` fails on a raw `<button>` / `<input>` / `<label>` / `<select>` / `<textarea>`.
Start every dashboard page with `<PageHeader>`. See `component.md` for the full list and variants.

## Key rules

- All dashboard pages are `'use client'` — no server components in `(dashboard)/`.
- Import across directory boundaries with `@/`, same-directory with `./`.
- Schema enums come from `@/graphql/types.generated` — never import from `apps/api`.
- Token is in `localStorage` — see `src/lib/auth.ts` for `getStoredUser()`.
