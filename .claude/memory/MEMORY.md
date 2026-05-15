# Memory Index

- [THM-20 Skill Audit](thm-20_skill-audit.md) — Patterns established during skill review: TypedRequest, homeJobRouter, schema naming, service=mutations only, buildUrl; two pending code changes
- [API pattern refactor](thm-21_2026-05-14.md) — THM-20 patterns applied globally across API modules: TypedRequest, homeJobRouter, route/schema naming, service mutations only, direct manager reads, and backend test coverage

- [Job Diagnosis & Management Tool](job_diagnosis_management.md) — Full product spec for the guided maintenance workflow — wizard, AI diagnostic, contractor outreach, job detail dashboard
- [Manager Architecture — patterns and tradeoffs](manager_architecture.md) — Settled decisions on manager method design — predicate-helper composition, filter vs search distinction, attach pattern for relations, cross-module imports, JOIN vs separate queries, optional-arg pattern, in-memory filtering prohibition
- [Permission Architecture](permissions_architecture.md) — Decisions made on the permissioning system — hasPermission pattern, caching strategy, route design
- [Testing Architecture](testing_architecture.md) — Test structure decisions — colocated tests, factories per model, cleanup pattern, what each layer tests
- [Contractor job matching](thm-10_2026-05-07.md) — Step 5 contractor results now load vendors by job category and home ZIP code, excluding vendors with no matching service ZIP.
- [Contractor detail page with job history](thm-11_2026-05-07.md) — GET /contractors/:id route + detail page showing name, company, categories, zip codes, contact info, notes, and a job history table with per-job status badges; contractor cards now navigate to the detail page on click
- [My Vendors rolodex](thm-12_2026-05-07.md) — Personal my_vendors rolodex with system vendor linking by email and dashboard filtering by home ZIP code
- [Shared UI components](thm-14_2026-04-28.md) — Table, Selector, Dropdown generic components added to apps/web/src/components/ui/; contractors page migrated to use all three
- [Recurring work AI estimate step](thm-15_2026-05-07.md) — Recurring-work job creation now includes a deterministic AI-style scoping chat that produces an editable RecurringSummary saved to the job AI session.
- [Prisma artifact cleanup and explicit contractor filters](thm-17_2026-05-13.md) — Removed obsolete Prisma files and made contractor matching use explicit frontend-provided trade category and ZIP filters.
- [Skills reorganization into api/ and web/ subdirectories](thm-20_2026-05-13.md) — Existing skills were moved from .ai/skills/ root into .ai/skills/api/ and .ai/skills/web/, new skills were added for all missing file types (schema, service, model, factory, ai-service, component, hook, form, shared-types), and CLAUDE.md/AGENTS.md were updated with the FE/BE split index.
- [Job creation wizard UI — stepper and IMPROVEMENT category](thm-2_2026-05-07.md) — Multi-step job wizard refactored with a stepper component, step labels, and IMPROVEMENT as a selectable category; steps 2–5 each have their own component under jobs/new/_components/
- [AI trade category suggestions](thm-3_2026-05-07.md) — New-job Step 4 now analyzes the description for TradeCategory suggestions with reasons and persists the confirmed category list in the job AI session for later splitting.
- [THM-5 run 2026-04-28](thm-5_2026-04-28.md) — AiSession JSONB model on Job; summary union discriminated by `intent`; shared types: ChatMessage, IssueSummary, ImprovementSummary, RecurringSummary, AiSessionSummary, AiSession
- [Job AI session schema](thm-5_2026-05-07.md) — Job diagnosis storage was normalized to aiSession/ai_session with intent-discriminated summaries shared between API validation and package types.
- [THM-8 run 2026-04-28](thm-8_2026-04-28.md) — Factory ran THM-8 on 2026-04-28 — PR opened successfully
- [Contractor edit button hidden from demo users](thm-9_2026-05-07.md) — Edit button on contractor cards only renders when user.role === 'ADMIN'; demo/non-admin users see the card but cannot edit
