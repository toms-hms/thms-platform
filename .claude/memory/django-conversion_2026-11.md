---
name: Django + Apollo conversion supersedes earlier conventions
description: PRs #34/#35 (2026-11) replaced the Express + Drizzle API with Django + Graphene GraphQL and moved the web to Apollo codegen; memory files written before then quote code and conventions that no longer apply.
type: project
---

The backend was converted to Django 5.2 + graphene-django and the web to Apollo Client 4 with
GraphQL Code Generator in PRs #34 and #35 (merged 2026-11). Older memory files describe the
Express + Drizzle API and the REST web client; where they disagree with `.ai/rules/` or a recipe,
the rule or recipe wins.

**Conventions set during the conversion review:**
- Models extend `core.models.BaseModel` (UUID `id`, `created_at`, `updated_at`, `__str__` = `"<Model> - <id>"`, no PII) and hold fields, `Meta` and choices only.
- Querysets expose generic `find(**kwargs)` (one row or `None`) and `find_first(**kwargs)`; there is no `get_or_404`. Services raise `NotFoundError`, mapped centrally.
- Services inject managers, clients and other services (`self._job_manager = job_manager or Job.objects`, `self._permission_service = …`), make one named manager call per lookup or write, never chain querysets and never call model-instance methods.
- Model services use plain `create` / `update` / `delete`; mutations are `create<Type>` / `update<Type>` / `delete<Type>`.
- List queries take plural arguments, are `@login_required`, and scope with `visible_to` / `owned_by`; foreign keys are exposed as nested objects only.
- Keyword parameters: required ids, required values, optional ids, optional values — each alphabetical (enforced by `core/tests/test_conventions.py`).
- One `0001_initial` per app until the first deploy.
- `apps/api/schema.graphql` is checked in; `make graphql-schema` rewrites it and regenerates web types.
- Web: `page.tsx` re-exports a `<Name>Page/` folder; sections past ~200 lines become nested folders with `index.ts`; one `.graphql` per operation in `queries/` / `mutations/` with generated files in `__generated__/`; build with `components/ui` (ESLint forbids raw form elements); forms use react-hook-form + zod; props interfaces are `<Component>Props`; frontend tests are black-box logic and behaviour only.
