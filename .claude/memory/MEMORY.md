# Memory Index

- [Job Diagnosis & Management Tool](job_diagnosis_management.md) — Full spec: wizard, AI diagnostic, contractor outreach, job detail dashboard, data model gaps, implementation phases
- [Permission Architecture](permissions_architecture.md) — hasPermission pattern, LRU cache, single routes, no role bypass in data checks
- [Testing Architecture](testing_architecture.md) — colocated __tests__ + factories per module, cleanup pattern, what each layer tests
- [AiSession data model](thm-5_2026-04-28.md) — AiSession stored as JSONB on Job; summary union (IssueSummary | ImprovementSummary | RecurringSummary) discriminated by `intent` field
- [Contractor multi-category and zip codes](thm-8_2026-04-28.md) — Contractor.categories is a tradeCategoryEnum array column; ContractorZipCode is a separate table; attachRelations loads zip codes only
- [Shared UI components](thm-14_2026-04-28.md) — Table, Selector, Dropdown in apps/web/src/components/ui/; contractors page migrated to use all three
