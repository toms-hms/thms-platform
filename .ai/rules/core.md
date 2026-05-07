# THMS Rules

## Imports
- Use `@/` for any import that crosses a directory boundary. Use `./` only for same-directory imports.
- Cross-app shared types: `@thms/shared` only. Never import from one app into the other.

## API responses
Always `{ data: {} }` or `{ error: { code, message } }`. No other shape.

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
Every manager implements:
- `hasPermission(userId, resourceId)` — pure data check, no role logic
- `listForUser(userId, role, ...args)` — role-aware query

Routes use `permit()` middleware for individual object access.

## Tests
Each module has `factories/` (one factory per model) and `__tests__/` (Manager, service, route).
Shared test infra in `src/test/`. See `.ai/skills/testing/SKILL.md` for the full pattern.

## Permissions
See `.ai/skills/permissioning/SKILL.md` for the full pattern before touching any route or manager.
