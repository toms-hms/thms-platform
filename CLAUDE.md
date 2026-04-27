# THMS Platform

Turborepo monorepo. `apps/api` (Express + Drizzle), `apps/web` (Next.js 14).

## Commands
```
make build-run   # build + start + open browser
make migrate     # DB migrations
make test        # run all tests (inside Docker)
make logs-api / logs-web
```

## Imports
- API: use `@/` for any import that would cross a directory boundary (e.g. `@/home/models/HomeManager`). Use `./` only for same-directory imports.
- Web: same — `@/` is already configured via Next.js.
- Cross-app shared types: `@thms/shared` only. Never import from one app into the other.

## Key rules
- API responses: `{ data: {} }` or `{ error: { code, message } }`
- Never auto-transition job/contractor status — user controls all state
- Auth: JWT Bearer token required on all routes except /auth/register + /auth/login

## Tests
Each module has `factories/` (one per model) and `__tests__/` (Manager, service, route). Shared infra in `src/test/`. See `/testing` for the full pattern.

## Permissions
Every manager implements `hasPermission(userId, resourceId)` (pure data, no role checks) and `listForUser(userId, role, ...args)` (role-aware query). Routes use `permit()` middleware for individual object access. See `/permissioning` for the full pattern.

## Memory
Consult `.claude/memory/MEMORY.md` for the index of architectural decisions. Load individual files only when relevant to the current task.
