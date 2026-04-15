# THMS Platform

Turborepo monorepo. `apps/api` (Express + Drizzle), `apps/web` (Next.js 14).

## Commands
```
make build-run   # build + start + open browser
make migrate     # DB migrations
make test        # run all tests (inside Docker)
make logs-api / logs-web
```

## Key rules
- API responses: `{ data: {} }` or `{ error: { code, message } }`
- Never auto-transition job/contractor status — user controls all state
- Auth: JWT Bearer token required on all routes except /auth/register + /auth/login

## Permissions
Every manager implements `hasPermission(userId, resourceId)` (pure data, no role checks) and `listForUser(userId, role, ...args)` (role-aware query). Routes use `permit()` middleware for individual object access. See `/permissioning` for the full pattern.

## Memory
Consult `.claude/memory/MEMORY.md` for the index of architectural decisions. Load individual files only when relevant to the current task.
