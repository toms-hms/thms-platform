# THM-20 Skill Audit — API & Web Skills

Skills reviewed and updated as part of THM-20. No production code was changed — all changes are in `.ai/skills/`. Two pending code changes must be applied globally in the follow-up ticket.

## Pending code changes (follow-up ticket)

- **`auth.middleware.ts`**: add `TypedRequest<P, Q, B>` utility type so route files can derive typed handler params from schema
- **`api.ts`** (web): add `buildUrl(path, params)` helper to replace manual `URLSearchParams` construction in query helpers

## Patterns established

### Route handlers (`route.md`)
- `@/` imports throughout, no `../` for cross-module imports
- Remove `getUser` helper — use `TypedRequest` for typed `req.user` access
- `homeJobRouter` for parent-scoped routers (was `jobCollectionRouter`)
- No `req.params as any` — `ParamsDictionary` index signature covers arbitrary keys; use `TypedRequest` for strong typing
- `PermissionService.list(manager, userId, role, ...args)` — args forwarded to `manager.listForUser`; manager owns both visibility and business filters
- GET with relation assembly goes in the route handler via `Promise.all`, not a service function

### Schema naming (`schema.md`)
- `XSchema` — route params for single item (e.g. `JobSchema = { jobId }`)
- `XsSchema` — query params for list (e.g. `JobsSchema = { status?, category? }`)
- `ParentXsSchema` — route params for parent-scoped collection (e.g. `HomeJobsSchema = { homeId }`)
- `CreateXSchema` / `UpdateXSchema` — request bodies (unchanged)
- Request types exported alongside schemas: `JobRequest`, `HomeJobsRequest`, `JobsRequest`

### Service layer (`service.md`)
- Mutations only: `createX`, `updateX`, `deleteX`
- No GET logic ever — reads go directly in the route handler
- `createJob` seeds `categorySuggestions: []`; AI diagnostic populates via `suggest_categories` tool
- `CATEGORY_RULES` / `suggestTradeCategories` removed — hardcoded keyword matching is wrong approach

### Testing (`testing.md`)
- Route tests: wire + auth gates only (200/401/403/400). Not for business logic.
- Service tests: mutation orchestration, cache warming/invalidation, ownership rules
- Manager tests: CRUD, `hasPermission`, `listForUser`
- Persisted FK columns → direct params; non-persisted join rows → `transient`

### Web API client (`api-client.md`)
- Replaces `query.md` — now covers both `queries.ts` and `mutations.ts`
- `buildUrl(path, params)` handles strings and arrays; eliminates manual `.forEach` + string concatenation
- Always type returns with DTOs from `@thms/shared`, never `any`
