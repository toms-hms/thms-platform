---
name: web-component
description: Guide for writing React components — shared vs page-local placement, props interface, and Tailwind utility classes.
---

# Web Component

## Where components live

```
src/components/ui/                      — design-system pieces shared by every page (Button, Field, Modal, …)
src/components/<area>/<Component>/      — a feature component used by more than one page (JobContractorsTab)
src/app/…/{route}/<Name>Page/<Section>/ — a section used only by one page, nested in the page's folder
```

Create a shared component when more than one page uses it; otherwise nest it as a section of
the page that uses it.

## Shared component example — StatusBadge

`StatusBadge` maps model enum values to Tailwind color classes and renders a styled `<span>`. The color maps use `Record<string, string>` keyed by enum value strings.

```typescript
// apps/web/src/components/ui/StatusBadge.tsx
const JOB_STATUS_COLORS: Record<string, string> = {
  DRAFT:             'bg-gray-100 text-gray-700',
  PLANNING:          'bg-blue-100 text-blue-700',
  REACHING_OUT:      'bg-yellow-100 text-yellow-700',
  COMPARING_QUOTES:  'bg-purple-100 text-purple-700',
  SCHEDULED:         'bg-indigo-100 text-indigo-700',
  IN_PROGRESS:       'bg-orange-100 text-orange-700',
  AWAITING_PAYMENT:  'bg-pink-100 text-pink-700',
  COMPLETED:         'bg-green-100 text-green-700',
};

const CONTRACTOR_STATUS_COLORS: Record<string, string> = {
  NOT_CONTACTED:   'bg-gray-100 text-gray-600',
  CONTACTED:       'bg-blue-100 text-blue-700',
  QUOTE_RECEIVED:  'bg-purple-100 text-purple-700',
  ACCEPTED:        'bg-green-100 text-green-700',
  DECLINED:        'bg-red-100 text-red-700',
  PAID:            'bg-emerald-100 text-emerald-700',
  // ... more statuses
};

function formatLabel(status: string) {
  return status.replace(/_/g, ' ');
}

interface Props {
  status: string;
  type?: 'job' | 'contractor';
}

export default function StatusBadge({ status, type = 'job' }: Props) {
  const colorMap = type === 'contractor' ? CONTRACTOR_STATUS_COLORS : JOB_STATUS_COLORS;
  const color = colorMap[status] ?? 'bg-gray-100 text-gray-700';
  return (
    <span className={`badge ${color}`}>{formatLabel(status)}</span>
  );
}
```

Usage:
```tsx
<StatusBadge status={job.status} />
<StatusBadge status={contractor.status} type="contractor" />
```

## Props interface naming

Name the props interface `Props` inside the file (no need to export it) unless another file imports the type:

```typescript
interface Props {
  value: string;
  onChange: (value: string) => void;
  options: SelectorOption[];
  placeholder?: string;
}
```

## Pages and sections: one folder per component

Every route's `page.tsx` is one line that re-exports a named page component, which lives in its
own folder beside it. Next requires the `page.tsx` filename; the folder gives the code a real name.

```
src/app/(dashboard)/contractors/
  page.tsx                        export { default } from './ContractorsPage';
  ContractorsPage/
    index.ts                      export { default } from './ContractorsPage';
    ContractorsPage.tsx           the page: its own query, shared state, and the sections
    types.ts                      types the sections share (`Contractor`, filter values)
    queries/Contractors.graphql
    ContractorFilters/
      index.ts
      ContractorFilters.tsx
    ContractorTable/
      index.ts
      ContractorTable.tsx
      mutations/                  DeleteContractor, AddContractorToRolodex
    ContractorFormModal/
      index.ts
      ContractorFormModal.tsx
      mutations/                  CreateContractor, UpdateContractor
```

- **Split at about 200 lines.** A component that grows past that splits into the visual sections
  you can see on screen (filters, list, card, form, modal), each a folder nested in its parent.
- **Every component folder has an `index.ts`** that re-exports the component, so imports read
  `import ContractorTable from './ContractorTable'`.
- **A section owns the operations it runs**, in its own `queries/` / `mutations/` folders. A query
  several sections read (the page's list, `JobDetail`) stays with the component that loads it.
- **The parent keeps shared data and state;** sections get it as props and report back through
  callbacks (`onEdit`, `onSaved`, `onClose`). A section keeps its own UI state (a form's fields,
  an "adding…" flag).
- **Logic that isn't UI** — a group of writes a page runs together — can be a hook in its own
  folder beside the sections (`NewJobWizardPage/useJobDraft/`).
- A folder without a `page.tsx` is never a route, so section folders need no `_` prefix.

## UI components: never raw elements

Pages and feature components build with `src/components/ui/`, never with raw form elements or
copied Tailwind strings. ESLint enforces it (`.eslintrc.json`): a raw `<button>`, `<input>`,
`<select>`, `<textarea>` or `<label>`, or an import of `next/link`, outside `components/ui/` fails
`next lint` and therefore `next build`.

| Component | Use for | Props |
|---|---|---|
| `Button` | every button | `variant`: `primary` (default) · `secondary` · `danger` · `muted` (text-only) · `bare` (bespoke UI styled by `className`); `size`: `md` · `sm`; `loading`, `loadingText`. Defaults to `type="button"`. |
| `Link` | every internal link | `variant`: `plain` (default) · `brand` · `muted` · `subtle` · `card` (a whole card that links) · `primary` / `secondary` (button-styled) |
| `Field` | a labelled control | `label` (text or JSX), `hint`, `error`, `name` (inside a `Form`, shows that field's validation message); links the label to its single child control |
| `Form`, `SubmitButton`, `FormActions`, `FormSelector` | every form | react-hook-form + zod; see `form.md` |
| `Alert` | an error, warning or note box | `tone`: `error` (default) · `warning` · `info` |
| `Input`, `Textarea`, `Select` | form controls | the native props; style overrides via `className` |
| `Selector` | a searchable select | `options`, `value`, `onChange` |
| `Card` | a white bordered surface | add padding and layout with `className` |
| `Badge` / `StatusBadge` | pills / job and contractor statuses | colour with `className` / `status`, `type` |
| `PageHeader` | the top of a dashboard page | `title`, `subtitle`, `back={{ href, label }}`, `actions` |
| `Modal`, `EmptyState`, `Table`, `Dropdown` | dialogs, empty lists, paged tables, menus | see each file |

- **`className` overrides, it doesn't fight.** Every component merges with `cn()` (`@/lib/cn`,
  `clsx` + `tailwind-merge`), so `<Button className="w-full">` or `<Input className="max-w-xs">`
  wins over the default.
- **Variants live in the component**, declared with `class-variance-authority`. A new look is a
  new variant there, not a class string repeated across pages.
- **Layout stays inline.** `flex gap-2`, `space-y-4`, grids and spacing are written where they
  are used; only reusable *controls and surfaces* become components.
- **An exception needs a reason.** The one raw element today is the `<label>` that opens the file
  picker in `ImagesTab` (styled with `buttonVariants`), marked
  `eslint-disable-next-line react/forbid-elements -- <why>`.

## Rules

- Components are `'use client'` only when they use browser APIs (`useState`, `useEffect`, event handlers). Display-only components don't need it.
- Cross-directory imports use `@/`; same-directory use `./`.
- No `any` types in shared components — use proper interfaces or generics.
- No API calls inside shared UI components — data flows in via props.
