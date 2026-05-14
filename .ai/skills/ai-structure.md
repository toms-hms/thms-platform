---
name: ai-structure
description: Map of all AI-readable files in this repo — rules, context, skills, commands, and memory.
---

# AI File Structure

All AI-readable files live in `.ai/` (shared across Claude and Codex) or `.claude/` (Claude-specific).

## Directory map

```
.ai/
  rules/
    core.md                   ← always-on constraints. Read before writing any code.
  context/
    api.md                    ← backend codebase snapshot. Load for API work.
    web.md                    ← frontend codebase snapshot. Load for web work.
  skills/
    ai-structure.md           ← this file.
    shared-types.md           ← how to add types to @thms/shared.
    api/
      file-structure.md       ← where files go in the API (module layout, naming).
      model.md                ← Drizzle table definitions (columns, enums, FKs, JSONB).
      schema.md               ← Zod validation schemas (naming, discriminated unions).
      service.md              ← service layer (orchestration, when NOT to use services).
      route.md                ← Express route handlers (auth, permit, validate, responses).
      manager.md              ← Manager classes (filter predicates, attach helpers, CRUD).
      permissioning.md        ← hasPermission, listForUser, permit middleware, cache.
      testing.md              ← test structure, factories, cleanup, what each layer covers.
      factory.md              ← fishery factories (transient params, onCreate, sequence).
      migrations.md           ← Drizzle migration workflow (generate vs hand-write).
      ai-service.md           ← OpenAI tool calling, JSON mode, multi-turn conversations.
    web/
      page.md                 ← Next.js App Router dashboard pages (useEffect, queries/mutations).
      component.md            ← React components (shared vs page-local, Tailwind classes).
      hook.md                 ← custom React hooks (placement, useRequireAuth pattern).
      form.md                 ← form handling (Modal + useState, FormEvent, error display).
      query.md                ← frontend query helpers and API parameter contracts.

.claude/
  commands/
    be.md                     ← /be  loads context/api.md
    fe.md                     ← /fe  loads context/web.md
    fs.md                     ← /fs  loads both context files
  memory/                     ← written by the factory after each run. Do not edit manually.
  settings.json               ← Claude permissions.

CLAUDE.md                     ← thin pointer into .ai/. Claude reads this automatically.
AGENTS.md                     ← same structure. Codex reads this automatically.
```

## Rules for each type

**Rules** — short, always-applicable constraints. Things that must never be violated. Read before writing any code.

**Context** — descriptions of what currently exists. Loaded on demand. Keep up to date as the codebase evolves.

**Skills** — procedural guides for specific task types. Read when the task matches. Organized by scope:
- `api/` for backend (Express, Drizzle, Zod, testing, permissions)
- `web/` for frontend (Next.js, React, Tailwind)
- root for cross-cutting concerns (`shared-types.md`, this file)

**Commands** — Claude slash commands invoked by typing `/name`. Thin wrappers that load context. Not read by Codex.

**Memory** — written by the factory after each successful run. Do not edit manually. `MEMORY.md` is the index.
