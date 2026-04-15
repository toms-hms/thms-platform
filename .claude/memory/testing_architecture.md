---
name: Testing Architecture
description: Test structure decisions — colocated tests, factories per model, cleanup pattern, what each layer tests
type: project
---

Tests and factories live inside the module they test. See `/testing` for the full implementation guide.

**Why:** centralised `__tests__/` had no connection to the modules it tested; colocated tests are easier to find and maintain.

**How to apply:** when adding a new module or model, create `factories/` and `__tests__/` alongside `models/`.

## Key decisions

**`__tests__/` and `factories/` as subdirectories per module**
Each module has `models/`, `factories/`, and `__tests__/`. Factories are not shared globally — they live with the model they create data for.

**One factory per model, one test file per layer**
`ModelName.factory.ts` → creates DB records directly via managers, sensible defaults + overrides.
`ModelNameManager.test.ts` → unit tests on DB operations and permission methods.
`service.test.ts` → verifies cache invalidation and orchestration.
`route.test.ts` → full HTTP integration tests via supertest.

**Namespace-based cleanup, not transaction rollback**
Each test file owns a unique email prefix (e.g. `test-home-route%`). `beforeAll`/`afterAll` deletes by that prefix. Transaction rollback was ruled out — requires changing manager interfaces.

**Delete homes before users**
`Job.createdByUserId` has no cascade from `User`. Must delete homes first (which cascade to jobs) before deleting users. Failure to do this causes FK constraint errors.

**Integration tests for routes, unit tests for managers**
Route tests use supertest and hit the real DB — no mocking of managers or services. Manager tests call managers directly. Service tests use `jest.spyOn` to verify cache behaviour without mocking.

**Every route test covers 401 and 403**
Standard pattern: no token → 401, authenticated but wrong user → 403, correct user → 200/201.

**Shared infrastructure in `src/test/`**
`globalSetup.ts` and `__mocks__/` (openai, googleapis) live in `src/test/`. No test-specific code there — just shared infrastructure.

**`src/test/` is the only non-module test directory**
`src/__tests__/` only contains `health.test.ts` — not module-specific, lives at root.
