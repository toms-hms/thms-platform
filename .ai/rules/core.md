# THMS Rules

## Function signatures
Destructure options-bag parameters at the function signature, not in the body. The exception: when a destructured name would shadow a function or import in scope (e.g. a `search` field colliding with a `search` helper), introduce a namespace import to disambiguate rather than renaming the destructure.

```typescript
// good
async filter({ zipCode, category, search }: FilterOpts = {}) { /* ... */ }

// bad — needless indirection
async filter(opts: FilterOpts = {}) { const { zipCode, category, search } = opts; /* ... */ }
```

## Imports
- Use `@/` for any import that crosses a directory boundary. Use `./` only for same-directory imports.
- Cross-app shared types: `@thms/shared` only. Never import from one app into the other.

## API responses
Always `{ data: {} }` or `{ error: { code, message } }`. No other shape.

## API and client contracts
Use explicit domain names and plural arrays for list filters whenever a field can
hold multiple values. Do not add singular aliases for convenience. A client that
filters contractors by one category still sends `tradeCategories=[value]`, not
`category=value`; one ZIP still uses `zipCodes=[value]`, not `zipCode=value`.
Prefer `tradeCategories` over generic `categories` at API/client boundaries.

## Enums and model constants
Always use the defined enum or constant instead of a raw string for model values.
- `JobIntent.ISSUE` not `'ISSUE'`
- `TradeCategory.HVAC` not `'HVAC'`
- `JobStatus.DRAFT` not `'DRAFT'`
- `UserRole.ADMIN` not `'ADMIN'`

Use them as `Record` keys too: `Record<JobIntent, string>` not `Record<string, string>`.
All enums are exported from `@thms/shared`.

## State transitions
Never auto-transition job or contractor status. The user controls all state.

## Auth
JWT Bearer token required on all routes except `/auth/register` and `/auth/login`.

## Managers
Every permissioned manager implements:
- `hasPermission(userId, resourceId)` — pure data check, no role logic
- `models/ModelNameManager.where.ts` exports `filterUser(userId)` — SQL visibility predicate for list routes

Routes use `permit()` middleware for individual object access.

## Comments
Every exported function must have a one-line JSDoc comment describing what it does, its key parameter assumptions, and what it returns. No commenting the obvious.
```ts
/** Returns contractors whose email matches any of the given addresses (case-insensitive). */
export function filterEmails(emails?: string[]): SQL | undefined
```

## Manager methods
See `.ai/skills/manager.md` for naming conventions and principles before writing any manager method.

## Migrations
Never write migration SQL by hand for schema changes. Run `npm run db:generate` in `apps/api/` to generate from the Drizzle model. See `.ai/skills/migrations.md` for when custom SQL is acceptable.

## Tests
Each module has `factories/` (one per model) and `__tests__/` (Manager, service, route).
Shared test infra in `src/test/`. See `.ai/skills/testing.md` for the full pattern.

## Permissions
See `.ai/skills/permissioning.md` for the full pattern before touching any route or manager.

## Branching
Never push directly to `main` or any default branch. Always create a feature branch and push there. Direct pushes to `main` are only permitted when the user explicitly instructs it.

## App boundaries
Code inside `apps/web` may only import from `apps/web` (via `@/`) and node_modules. Code inside `apps/api` may only import from `apps/api` (via `@/`) and node_modules.

**No imports from `@thms/shared`.** No imports from one app into another. The web and api are deployed to separate servers — they cannot share runtime code. Types that need to cross the boundary must come from the generated API client in `apps/web/src/types/api.gen.ts` (see the type generation workflow in `.ai/skills/api-client.md`).

This is a hard rule. Cross-app imports break independent deployment.
