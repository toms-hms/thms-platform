---
name: web-api-client
description: Guide for frontend GraphQL operations — one .graphql file per query or mutation colocated with the file that uses it, codegen'd typed documents, and Apollo Client 4 hooks.
---

# Web API Client

The API is GraphQL and the web app talks to it through **Apollo Client 4**. Every
operation is a `.graphql` file next to the page or component that uses it. Codegen
writes a `.generated.ts` beside it exporting a typed document, and the component
passes that document to Apollo's `useQuery` / `useMutation`. Result and variable
types flow from the document; nothing is typed by hand.

```
src/app/(dashboard)/contractors/
  page.tsx
  Contractors.graphql              ← one operation, written by hand
  Contractors.generated.ts         ← ContractorsDocument, ContractorsQuery, ContractorsQueryVariables
  CreateContractor.graphql
  CreateContractor.generated.ts
```

## One operation per file, owned by the file that uses it

- **One query or mutation per `.graphql` file**, named after the operation
  (`Contractors.graphql` holds `query Contractors`).
- **It lives next to the file that calls it.** If two files need similar data, each owns
  its own operation with its own name (`JobContractorPicker`, `WizardContractors`).
  Operation names are global, so prefix by owner when they would collide.
- **Select only what that file renders.** No shared field lists and no shared
  "entity" fragments: a page that shows a name selects `name`, not the whole type.
- **Fragments only when one component renders data from more than one query.** Then
  the fragment lives next to that component and describes what it renders. Nothing
  needs one today.
- **Always select `id`** on every object, so Apollo's cache can normalise it.

## Using an operation

```typescript
import { useMutation, useQuery } from '@apollo/client/react';
import { ContractorsDocument } from './Contractors.generated';
import { DeleteContractorDocument } from './DeleteContractor.generated';

const { data, loading: fetching, refetch } = useQuery(ContractorsDocument, {
  variables: { tradeCategories: category ? [category] : undefined },
});
const contractors = data?.contractors ?? [];
const loading = fetching && !data;

const [deleteContractor] = useMutation(DeleteContractorDocument);
await deleteContractor({ variables: { contractorId } });
await refetch();
```

- React hooks come from `@apollo/client/react`; the client and links from `@apollo/client`.
- A failed mutation **throws**. Wrap it in `try/catch` and show `err.message`; the API's
  stable code is available through `errorCode(err)` from `@/lib/apollo`.
- A query that should not run yet passes `skipToken` instead of options.
- An imperative read (an OAuth URL on click) uses `useApolloClient().query(...)` with
  `fetchPolicy: 'network-only'`.

## Keeping the screen current after a write

- **Updates** need nothing: when a mutation returns the changed object with its `id`
  and the fields the page shows, Apollo's cache updates every query holding it.
- **Creates and deletes** change list membership. Call the list query's `refetch()`,
  or pass `refetchQueries: [SomeDocument]` to `useMutation` when the list belongs to a
  parent (the job tabs refetch `JobDetailDocument`).

## Types

- Result types: `ContractorsQuery['contractors'][number]`, from the operation's
  `.generated.ts`. Use them for props: the job tabs take `JobDetail` (`components/jobs/types.ts`).
- Schema enums and inputs: `@/graphql/types.generated` (`TradeCategory.PLUMBING`).
- `@/types/api` holds only what the schema leaves untyped: the AI session's JSON
  shapes, and `UserRole`.
- Fields the schema exposes as `String` (contractor `categories`, job `status`) come back
  as `string`. Cast at the point of use (`value as TradeCategory`).
- `JSONString` fields (`aiSession`, `summary`, `metadata`) arrive as strings:
  `JSON.parse` on the way in, `JSON.stringify` on the way out.

## Codegen

```bash
make graphql-schema          # re-export apps/api/schema.graphql, then regenerate
cd apps/web && npm run codegen         # regenerate after editing a .graphql file
cd apps/web && npm run codegen:check   # fails if a generated file is stale
```

- The schema comes from the API's checked-in `apps/api/schema.graphql`. An API test
  fails when that file is stale, so a schema change and its web impact land in the same PR.
- Codegen validates every operation against the schema: an unknown field or argument
  fails the run.
- Generated files are committed. Never edit them.

## Variables, never interpolation

Every value travels as a variable typed in the operation signature. `.graphql` files
cannot interpolate, so this holds by construction.

## List filter rules

- Plural array arguments for every list filter: `homeIds`, `statuses`, `tradeCategories`.
- No singular aliases for convenience. One selected value is still an array:
  `tradeCategories: category ? [category] : undefined`.

## No hidden lookups

Do not pass a convenience id so the backend can infer filters. Load the values and pass them:

```typescript
// Bad
useQuery(ContractorsDocument, { variables: { jobId } });

// Good
useQuery(WizardContractorsDocument, { variables: { zipCodes: [home.zipCode], tradeCategories: categories } });
```
