# Memory Index

- [Job Diagnosis & Management Tool](job_diagnosis_management.md) — Full product spec for the guided maintenance workflow — wizard, AI diagnostic, contractor outreach, job detail dashboard
- [Permission Architecture](permissions_architecture.md) — Decisions made on the permissioning system — hasPermission pattern, caching strategy, route design
- [Stack decisions — Drizzle over Prisma](stack_decisions.md) — Prisma replaced because single schema.prisma file conflicted with module structure; migration complete; Prisma artifacts in prisma/ are dead files
- [Testing Architecture](testing_architecture.md) — Test structure decisions — colocated tests, factories per model, cleanup pattern, what each layer tests
- [Contractor detail page with job history](thm-11_2026-05-07.md) — GET /contractors/:id route + detail page showing name, company, categories, zip codes, contact info, notes, and a job history table with per-job status badges; contractor cards now navigate to the detail page on click
- [Job creation wizard UI — stepper and IMPROVEMENT category](thm-2_2026-05-07.md) — Multi-step job wizard refactored with a stepper component, step labels, and IMPROVEMENT as a selectable category; steps 2–5 each have their own component under jobs/new/_components/
- [THM-5 run 2026-04-28](thm-5_2026-04-28.md) — AiSession JSONB model on Job; summary union discriminated by `intent`; shared types: ChatMessage, IssueSummary, ImprovementSummary, RecurringSummary, AiSessionSummary, AiSession
- [Contractor multi-category and zip codes](thm-8_2026-04-28.md) — Contractor.categories is a tradeCategoryEnum array column (no join table); ContractorZipCode is a separate table; attachRelations loads zip codes only
- [Contractor edit button hidden from demo users](thm-9_2026-05-07.md) — Edit button on contractor cards only renders when user.role === 'ADMIN'; demo/non-admin users see the card but cannot edit
