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

## Recipes
Detailed how-to guides for common task types. Load only what the task requires.

**Shared / cross-cutting**
- AI file structure: `.ai/recipes/ai-structure.md`
- How to write a recipe (meta): `.ai/recipes/recipe.md`
- Shared package types (`@thms/shared`): `.ai/recipes/shared-types.md`

**Backend (API)**
- File structure & module layout: `.ai/recipes/api/file-structure.md`
- Drizzle model / table definition: `.ai/recipes/api/model.md`
- Zod schema: `.ai/recipes/api/schema.md`
- Service layer: `.ai/recipes/api/service.md`
- Route handlers: `.ai/recipes/api/route.md`
- Manager (DB queries, predicates): `.ai/recipes/api/manager.md`
- Permissioning: `.ai/recipes/api/permissioning.md`
- Testing & factories: `.ai/recipes/api/testing.md`
- Test factories: `.ai/recipes/api/factory.md`
- Migrations: `.ai/recipes/api/migrations.md`
- AI service / OpenAI tool use: `.ai/recipes/api/ai-service.md`

**Frontend (Web)**
- Page (Next.js App Router): `.ai/recipes/web/page.md`
- Component: `.ai/recipes/web/component.md`
- Custom hook: `.ai/recipes/web/hook.md`
- Form handling: `.ai/recipes/web/form.md`
- Query helpers & API contracts: `.ai/recipes/web/query.md`

## Memory
Consult `.claude/memory/MEMORY.md` for the index of what has been built. Load individual files only when relevant.
