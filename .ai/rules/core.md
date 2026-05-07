# THMS Rules

## Imports
- Use `@/` for any import that crosses a directory boundary. Use `./` only for same-directory imports.
- Cross-app shared types: `@thms/shared` only. Never import from one app into the other.

## API responses
Always `{ data: {} }` or `{ error: { code, message } }`. No other shape.

## State transitions
Never auto-transition job or contractor status. The user controls all state.

## Auth
JWT Bearer token required on all routes except `/auth/register` and `/auth/login`.

## Managers
Every manager implements:
- `hasPermission(userId, resourceId)` — pure data check, no role logic
- `listForUser(userId, role, ...args)` — role-aware query

Routes use `permit()` middleware for individual object access.

## Comments
Every exported function must have a one-line JSDoc comment describing what it does, its key parameter assumptions, and what it returns. No commenting the obvious.
```ts
/** Returns the contractor whose email matches the given address (case-insensitive). */
async filterEmail(email: string): Promise<Contractor | undefined>
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
