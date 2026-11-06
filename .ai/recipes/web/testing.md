---
name: web-testing
description: Guide for frontend tests — what earns a test (logic and user-visible behaviour, black-box), what doesn't (rendering, styling, pages), and moving logic into pure functions to test it. Keep the suite small.
---

# Web Testing

Frontend tests are **few and about logic**. A test earns its place by catching a change in
behaviour that nothing else would catch. Tests that check a component rendered some text or
carries some class break on every redesign and catch nothing, so we don't write them.

Jest + Testing Library, in `apps/web/src/__tests__/`. Run with `npm test` in `apps/web`.

## What earns a test

- **Pure logic in `lib/` or beside a page:** form field rules (`formFields.test.ts`), filters
  (`matchesFilters.test.ts`), the Apollo client's auth and session handling (`apollo.test.ts`).
- **Behaviour a user relies on that could break silently**, tested black-box through what the
  user does and what comes out: a `Form` blocks an invalid submit and shows the API's error; a
  `Modal` calls `onClose`; a `Selector`'s search filters; a `Table` pages.

## What doesn't

- **"It renders":** text, headings, a component mounting, an empty-state message.
- **Styling:** class names, variants, colours, snapshots.
- **Presentational components:** `Card`, `Badge`, `StatusBadge`, `EmptyState`, `PageHeader`.
- **Pages.** They're covered by `tsc`, codegen (every operation is validated against the schema)
  and the API's own tests. A page whose logic needs a test has logic to move out (below).
- **Implementation details:** internal state, which hook was called, private helpers.

## Move logic out to test it

When a component holds real logic, pull it into a pure function beside it and test that:

```ts
// JobsPage/matchesFilters.ts
export function matchesFilters(job: JobRow, { search, status }: JobFilterValues): boolean { … }

// __tests__/matchesFilters.test.ts
expect(matchesFilters(job, { search: 'FAUCET', status: '' })).toBe(true);
```

The component then only wires it up: `jobs.filter((job) => matchesFilters(job, filters))`.

## How to write one

- **Black-box:** drive it the way a user would (`userEvent.type`, `click`), assert on what they'd
  see or on the callback the parent receives (`toHaveBeenCalledWith(...)`).
- **Query by role or label** (`getByRole('button', { name: 'Save' })`, `getByLabelText('Title')`),
  never by class or test id.
- **One behaviour per test, named for it:** `'stays on the last page that exists when the rows shrink'`.
- **Mock only the network** (`global.fetch` in `apollo.test.ts`). Don't mock our own modules.

Before adding a test, ask: if this broke, would a user notice, and would nothing else catch it?
If not, don't add it.
