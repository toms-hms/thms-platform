---
name: api-testing
description: Guide for adding tests — directory structure, factories, cleanup pattern, and what each test layer covers.
---

# API Testing Pattern

Tests and factories are colocated with the module they test. Every module has `factories/` and `__tests__/` alongside `models/`.

## Directory structure per module

```
src/{module}/
  models/
    ModelName.ts
    ModelNameManager.ts
  factories/
    ModelName.factory.ts       — one factory per model
  __tests__/
    ModelNameManager.test.ts   — unit tests: DB operations, hasPermission, listForUser
    service.test.ts            — service layer: orchestration, cache invalidation
    route.test.ts              — integration: HTTP via supertest, 401/403/200
```

Shared infrastructure lives in `src/test/`:

```
src/test/
  globalSetup.ts
  __mocks__/
    openai.js        — mocks OpenAI SDK
    googleapis.js    — mocks Google APIs
```

## Factories

See `.ai/skills/api/factory.md` for the full factory pattern.

Quick example:

```typescript
const job = await jobFactory.create(
  { category: TradeCategory.ELECTRICAL },
  { transient: { homeId: home.id, userId: user.id } },
);
```

## Cleanup pattern

Each test file owns a unique email namespace. `beforeAll` and `afterAll` delete by that namespace.

**Delete homes before users** — `Job.createdByUserId` has no cascade from `User`. Deleting a home cascades to all its jobs.

```typescript
// apps/api/src/job/__tests__/route.test.ts (cleanup)
const EMAIL_NS = 'test-jobs-route';

async function cleanup() {
  const testUsers = await db.select().from(users).where(like(users.email, `${EMAIL_NS}%`));
  for (const u of testUsers) {
    const uhs = await db.select().from(userHomes).where(eq(userHomes.userId, u.id));
    if (uhs.length) {
      await db.delete(homes).where(inArray(homes.id, uhs.map((uh) => uh.homeId)));
    }
  }
  await db.delete(users).where(like(users.email, `${EMAIL_NS}%`));
}

beforeAll(cleanup);
afterAll(cleanup);
```

## loginAs helper

```typescript
async function loginAs(email: string) {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password: 'password123' });
  return res.body.data.tokens.accessToken as string;
}
```

## What each test file covers

### `ModelNameManager.test.ts`
- CRUD: `create`, `findById`, `update`, `delete`
- `hasPermission(userId, resourceId)`: true for owner/member, false for non-member, false for unknown ID
- `listForUser(userId, role)`: USER returns scoped results, ADMIN returns all

### `service.test.ts`
- Cache warming on create/add (`PermissionService.set`)
- Cache invalidation on delete/remove (`PermissionService.invalidate`)
- Ownership checks (e.g. only OWNER can delete)
- Use `jest.spyOn` to verify cache operations without mocking managers

### `route.test.ts`

```typescript
// Happy path: correct user gets 200/201
it('GET /api/v1/jobs/:id returns the job for the owner', async () => {
  const token = await loginAs(`${EMAIL_NS}@example.com`);
  const res = await request(app)
    .get(`/api/v1/jobs/${job.id}`)
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.data.id).toBe(job.id);
});

// 401 — no token
it('returns 401 with no auth token', async () => {
  const res = await request(app).get(`/api/v1/jobs/${job.id}`);
  expect(res.status).toBe(401);
});

// 403 — authenticated but no access
it('returns 403 for a different user', async () => {
  const otherToken = await loginAs(`${EMAIL_NS}-other@example.com`);
  const res = await request(app)
    .get(`/api/v1/jobs/${job.id}`)
    .set('Authorization', `Bearer ${otherToken}`);
  expect(res.status).toBe(403);
});

// 400 — invalid input
it('returns 400 for missing required fields', async () => {
  const token = await loginAs(`${EMAIL_NS}@example.com`);
  const res = await request(app)
    .post(`/api/v1/homes/${home.id}/jobs`)
    .set('Authorization', `Bearer ${token}`)
    .send({ title: '' });   // title fails min(1)
  expect(res.status).toBe(400);
});
```

## Running tests

```bash
make test-api                                              # all backend tests in Docker
# or inside the container:
NODE_OPTIONS="--max-old-space-size=3072" npx jest --runInBand --forceExit
npx jest src/job/__tests__/route.test.ts                   # single file
```
