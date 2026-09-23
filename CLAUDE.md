# THMS Platform

Monorepo. `apps/api` (Django + Graphene GraphQL, Python 3.12), `apps/web` (Next.js 14).

## Build commands
```
make build-run   # build + start + open browser
make migrate     # DB migrations
make seed        # demo data
make test        # run all tests (inside Docker)
make logs-api / logs-web
```

The API is GraphQL at `POST /graphql`; GraphiQL is served at the same path in development.

## Rules
Read `.ai/rules/core.md` before writing any code. These always apply.

## Context
Load context on demand — do not load both unless the task spans both apps:
- Backend work: read `.ai/context/api.md`
- Frontend work: read `.ai/context/web.md`

Use `/be`, `/fe`, or `/fs` to load context via slash command.

## Recipes
Detailed how-to guides for common task types. Load only what the task requires.

**Shared / cross-cutting**
- AI file structure: `.ai/recipes/ai-structure.md`
- How to write a recipe (meta): `.ai/recipes/recipe.md`

**Backend (API)**
- File structure & app layout: `.ai/recipes/api/file-structure.md`
- Django model / table mapping: `.ai/recipes/api/model.md`
- Manager (queries, filters, permission predicates): `.ai/recipes/api/manager.md`
- Service layer: `.ai/recipes/api/service.md`
- GraphQL types, queries & mutations: `.ai/recipes/api/graphql.md`
- Permissioning: `.ai/recipes/api/permissioning.md`
- Authentication (JWT, password hashing): `.ai/recipes/api/auth.md`
- Audit log: `.ai/recipes/api/audit.md`
- Testing: `.ai/recipes/api/testing.md`
- Test factories: `.ai/recipes/api/factory.md`
- Migrations: `.ai/recipes/api/migrations.md`
- AI service / OpenAI tool use: `.ai/recipes/api/ai-service.md`

**Frontend (Web)**
- Page (Next.js App Router): `.ai/recipes/web/page.md`
- Component: `.ai/recipes/web/component.md`
- Custom hook: `.ai/recipes/web/hook.md`
- Form handling: `.ai/recipes/web/form.md`
- GraphQL client (queries & mutations): `.ai/recipes/web/api-client.md`

## Memory
Consult `.claude/memory/MEMORY.md` for the index of what has been built. Load individual files only when relevant.

Memory files written before the Django conversion describe the Express + Drizzle API. The decisions they record (permission model, manager conventions, test layering) still hold; the code they quote does not.
