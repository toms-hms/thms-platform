---
name: recipe
description: How to author a recipe (.ai/recipes/<area>/<task>.md) — the format every recipe in this repo follows. Follow this when a subtask creates a new recipe.
---

# Writing a recipe

A recipe is a procedural how-to for writing or modifying **one recurring
file-type** in this codebase — a route, a model, a form, a hook. The factory's
executor reads the recipe before writing code, then follows it mechanically.
Recipes are passive references: nothing auto-invokes them; a ticket subtask
points at one by path.

Write every recipe so a **small local model** can follow it without making a
design decision.

## Naming and placement

- Lives at `.ai/recipes/<area>/<task>.md` (`api/`, `web/`), or at the root for
  cross-cutting topics (like this file and `shared-types.md`).
- Named after **what the file IS** in this codebase's own vocabulary, taken from
  the directory: `routers/` → `route.md`, `models/` → `model.md`,
  `components/` → `component.md`. For a single-purpose file in a generic
  directory, name it after the file's role (`lib/chatApi.ts` → `api-client.md`),
  not the directory.
- Never rename based on contents: a router that contains endpoints is still
  `route.md`, not `endpoint.md`.

## Frontmatter

```
---
name: <task>             # matches the filename, kebab-case
description: <one line>  # used to SELECT the recipe at ticket time — be specific
---
```

The `description` is load-bearing: `/ticket` reads it to decide whether the
recipe applies to a ticket. Vague descriptions get the wrong recipes selected.

## Body — describe the pattern, not an instance

- Document the **repeatable pattern**, drawn from code actually in the repo:
  the steps in order, the required conventions, the naming rules, the gotchas.
- **No exemplar file pointers.** "Copy `homeJobRouter.ts`" rots the moment that
  file changes. Encode the pattern itself, not a pointer to one example.
- The **recipe owns the pattern; the subtask owns the specifics.** Don't restate
  what a subtask will supply (this feature's exact columns, signatures, copy).
  Conversely, anything a subtask *can't* know — the structural rules of the
  file-type — belongs here.
- Keep it short: 30–80 lines. If you can't describe a real, recurring pattern,
  don't write the recipe — a stub is worse than none.

## Never

- No `# TODO` placeholders. Omit a section rather than stub it.
- No design decisions left to the executor. If following the recipe still
  requires choosing between approaches, the recipe isn't done — pin the choice
  down or push it into the subtask body.

## When a recipe drifts

If a ticket's work no longer matches its recipe, **update the recipe in the same
change** — don't work around it. The recipe is the source of truth for its
file-type, and the next ticket will trust it.
