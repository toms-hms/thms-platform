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
Detailed how-to guides for common task types:
- New API module: `.ai/skills/new-api-module.md`
- New web page: `.ai/skills/new-web-page.md`
- Testing pattern: `.ai/skills/testing.md`
- Permissioning pattern: `.ai/skills/permissioning.md`
- API file structure: `.ai/skills/api-file-structure.md`
- AI file structure: `.ai/skills/ai-structure.md`
- Migrations: `.ai/skills/migrations.md`

## Memory
Consult `.claude/memory/MEMORY.md` for the index of what has been built. Load individual files only when relevant.
