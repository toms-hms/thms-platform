# AI File Structure

This repo follows the shared ai_factory convention. All AI-readable files live in `.ai/` (shared across Claude and Codex) or `.claude/` (Claude-specific).

## Structure

```
.ai/
  rules/core.md              ← always-on constraints. Read before writing any code.
  context/api.md             ← backend codebase snapshot. Load for API work.
  context/web.md             ← frontend codebase snapshot. Load for web work.
  skills/testing.md          ← how to write tests in this repo.
  skills/permissioning.md    ← how to implement permissions correctly.
  skills/new-api-module.md   ← how to scaffold a new API module.
  skills/new-web-page.md     ← how to scaffold a new web page.
  skills/api-file-structure.md ← where files go in the API.
  skills/ai-structure.md     ← this file.

.claude/
  commands/be.md             ← /be  loads context/api.md
  commands/fe.md             ← /fe  loads context/web.md
  commands/fs.md             ← /fs  loads both context files
  memory/                    ← written by the factory after each run. Do not edit manually.
  settings.json              ← Claude permissions.

CLAUDE.md                    ← thin pointer into .ai/. Claude reads this automatically.
AGENTS.md                    ← same structure. Codex reads this automatically.
```

## Rules for each type

**Rules** — short, always-applicable constraints. Things that must never be violated.
Read before writing any code.

**Context** — descriptions of what currently exists. Loaded on demand.
Keep up to date as the codebase evolves. Stale context is worse than no context.

**Skills** — procedural guides for specific task types. Read when the task matches.

**Commands** — Claude slash commands invoked by typing `/name` in the terminal.
Thin wrappers that load context or reference a skill. Not read by Codex.

**Memory** — written by the factory after each successful run. Do not edit manually.
`MEMORY.md` is the index. Individual files hold per-run or per-topic records.
