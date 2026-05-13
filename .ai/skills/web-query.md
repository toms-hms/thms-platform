---
name: web-query
description: Guide for frontend query helpers and API query parameter contracts.
---

# Web Query Contracts

Query helpers in `apps/web` define the client-side API contract. Keep them
explicit, typed, and aligned with backend route names.

## List Filter Rules

- Use plural array fields for filters that can hold multiple values.
- Do not add singular helper params as aliases for plural API params.
- Use domain-explicit names. Prefer `tradeCategories` over generic `categories`
  when values are `TradeCategory`.
- If the UI has one selected value, wrap it in a one-item array before calling
  the query helper.

```ts
// Good
listContractors({
  tradeCategories: selectedTradeCategory ? [selectedTradeCategory] : undefined,
  zipCodes: zipCode ? [zipCode] : undefined,
});

params.tradeCategories?.forEach((value) => qs.append('tradeCategories', value));
params.zipCodes?.forEach((value) => qs.append('zipCodes', value));
```

```ts
// Bad
listContractors({ category, zipCode });
qs.set('category', category);
qs.set('zipCode', zipCode);
```

## Hidden Lookups

Do not pass convenience IDs to collection endpoints so the backend can infer
filters. If a workflow has a home ZIP or confirmed trade categories, the
frontend should load those values explicitly and pass them as `zipCodes` and
`tradeCategories`.
