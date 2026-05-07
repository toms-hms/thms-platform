# API File Structure Rules

## Module pattern (enforced)

Every resource **must** follow this structure:

```
src/{module}/
  route.ts    — Router only. No business logic. Import from schema + service.
  schema.ts   — Zod schemas only. No imports from route or service.
  service.ts  — Business logic only. No Express types.
```

## Rules

1. **route.ts** — only contains Express Router handlers. Each handler: validate input, call service, return `{ data }` or pass to `next(err)`.
2. **schema.ts** — only Zod schemas. Export named schemas, e.g. `CreateXSchema`, `UpdateXSchema`.
3. **service.ts** — only async functions. Takes plain args (no req/res). Returns data or throws from `utils/errors`.
4. **No barrel files** — import directly from `./schema`, `./service`, `../config/prisma`, etc.
5. **No cross-module service imports in routes** — if module A's route needs module B's logic, import B's service directly.
6. **Tests** — one file per module at `src/__tests__/{module}.test.ts`. Tests hit real DB. Clean up in correct order (children before parents).

## What goes where

| Code | File |
|------|------|
| Zod schema | `schema.ts` |
| DB query (Prisma) | `service.ts` |
| HTTP status code | `route.ts` |
| Error throw | `service.ts` (use utils/errors) |
| JWT decode | `middleware/auth.middleware.ts` |
| Env var | `config/env.ts` |

## Naming

- Module directories: singular noun — `job`, `home`, `contractor`, not `jobs`, `homes`
- Files: `route.ts`, `schema.ts`, `service.ts` — always these exact names
- Service functions: `listX`, `getX`, `createX`, `updateX`, `deleteX`
- Schema exports: `CreateXSchema`, `UpdateXSchema`, `XSchema`
