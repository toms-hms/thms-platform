---
name: ai-structure
description: Map of all AI-readable files in this repo — rules, context, recipes, commands, and memory.
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
  recipes/
    ai-structure.md           ← this file.
    recipe.md                 ← how to write a recipe (the meta-recipe).
    api/
      file-structure.md       ← where files go in the API (app layout, what each file holds).
      model.md                ← Django models mapped onto the pre-existing schema.
      queryset.md             ← querysets (chainable filters, None vs [], visible_to / owned_by).
      manager.md              ← managers (filter compositions, writes, value lookups).
      service.md              ← service layer (orchestration, when NOT to use services).
      types.md                ← GraphQL object types (types.py).
      schema.md               ← GraphQL queries, mutations, enums, access decorators, error codes.
      permissioning.md        ← Permission names, role map, @authorize / @owner_required, the cache.
      auth.md                 ← JWT contract, Django password hashers, refresh-token digests, request.user.
      audit.md                ← django-auditlog registration, exclusions, reading the log.
      testing.md              ← test structure, GraphQLTestCase, what each layer covers.
      factory.md              ← factory_boy factories (SubFactory, post_generation).
      migrations.md           ← migration workflow, data migrations, the missing-migration check.
      ai-service.md           ← OpenAI tool calling, JSON mode, multi-turn conversations.
    web/
      page.md                 ← Next.js App Router dashboard pages (useEffect, queries/mutations).
      component.md            ← React components (shared vs page-local, Tailwind classes).
      hook.md                 ← custom React hooks (placement, useRequireAuth pattern).
      form.md                 ← form handling (Modal + useState, FormEvent, error display).
      api-client.md           ← GraphQL client, queries/mutations, filter contracts.

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

**Recipes** — procedural guides for specific task types. Read when the task matches. Organized by scope:
- `api/` for backend (Django, Graphene, managers, testing, permissions)
- `web/` for frontend (Next.js, React, Tailwind)
- root for cross-cutting concerns (`recipe.md` — how to write a recipe, this file)

**Commands** — Claude slash commands invoked by typing `/name`. Thin wrappers that load context. Not read by Codex.

**Memory** — written by the factory after each successful run. Do not edit manually. `MEMORY.md` is the index.
