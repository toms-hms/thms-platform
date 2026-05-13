---
name: api-route
description: Guide for API route query contracts and route handler boundaries.
---

# API Route Contracts

Routes translate HTTP input into explicit manager filters or service calls. Keep
resource lookup, ownership traversal, and orchestration out of list/search route
handlers unless the URL is explicitly scoped to that parent resource.

## List and Search Endpoints

- Accept explicit query filters from the caller.
- Pass filters directly to a manager method so filtering stays in SQL.
- Do not infer filters through hidden parent-resource lookups.
- Use plural query names for every list filter that can hold multiple values.
- Do not support singular aliases. If a client has one value, it still wraps it
  in the plural contract.
- Use domain-explicit names at API boundaries. Prefer `tradeCategories` over
  generic `categories` when the values are `TradeCategory`.

```ts
// Good: frontend sends the exact search contract.
GET /api/v1/contractors?tradeCategories=PLUMBING&zipCodes=78745

const contractors = await ContractorManager.filter({
  isGlobal: true,
  tradeCategories: tradeCategoryList(req.query.tradeCategories),
  zipCodes: stringList(req.query.zipCodes),
});
```

```ts
// Bad: list endpoint hides a cross-resource lookup behind a convenience param.
GET /api/v1/contractors?jobId=job_123

const job = await JobManager.findById(req.query.jobId);
const home = await HomeManager.findById(job.homeId);
const contractors = await ContractorManager.filter({
  tradeCategories: [job.category],
  zipCodes: [home.zipCode],
});
```

```ts
// Bad: singular aliases make the contract ambiguous.
GET /api/v1/contractors?category=PLUMBING&zipCode=78745
```

## When Parent Lookups Are OK

Use parent-resource lookup in routes that are explicitly scoped by that parent:

```ts
GET /api/v1/jobs/:jobId/contractors
GET /api/v1/homes/:homeId/jobs
```

For unscoped collection routes like `/api/v1/contractors`, require the caller to
pass concrete filters such as `tradeCategories` and `zipCodes`.
