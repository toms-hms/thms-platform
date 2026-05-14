# THMS Platform

Turborepo monorepo. `apps/api` (Express + Drizzle), `apps/web` (Next.js 14).

## Build commands
```
make build-run   # build + start + open browser
make migrate     # DB migrations
make test        # run all tests (inside Docker)
make logs-api / logs-web
```

## Rules
Read `.ai/rules/core.md` before writing any code. These always apply.

## Context
Load context on demand — do not load both unless the task spans both apps:
- Backend work: read `.ai/context/api.md`
- Frontend work: read `.ai/context/web.md`

## Skills
Detailed how-to guides for common task types. Load only what the task requires.

**Shared / cross-cutting**
- AI file structure: `.ai/skills/ai-structure.md`
- Shared package types (`@thms/shared`): `.ai/skills/shared-types.md`

**Backend (API)**
- File structure & module layout: `.ai/skills/api/file-structure.md`
- Drizzle model / table definition: `.ai/skills/api/model.md`
- Zod schema: `.ai/skills/api/schema.md`
- Service layer: `.ai/skills/api/service.md`
- Route handlers: `.ai/skills/api/route.md`
- Manager (DB queries, predicates): `.ai/skills/api/manager.md`
- Permissioning: `.ai/skills/api/permissioning.md`
- Testing & factories: `.ai/skills/api/testing.md`
- Test factories: `.ai/skills/api/factory.md`
- Migrations: `.ai/skills/api/migrations.md`
- AI service / OpenAI tool use: `.ai/skills/api/ai-service.md`

**Frontend (Web)**
- Page (Next.js App Router): `.ai/skills/web/page.md`
- Component: `.ai/skills/web/component.md`
- Custom hook: `.ai/skills/web/hook.md`
- Form handling: `.ai/skills/web/form.md`
- Query helpers & API contracts: `.ai/skills/web/query.md`

## Memory
Consult `.claude/memory/MEMORY.md` for the index of what has been built. Load individual files only when relevant.
