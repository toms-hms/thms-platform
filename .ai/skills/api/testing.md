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
    ModelNameManager.test.ts   — manager: DB operations, hasPermission, listForUser
    service.test.ts            — service: mutation orchestration, cache invalidation
    route.test.ts              — route: HTTP via supertest, auth/permission gates, happy path
```

Shared infrastructure lives in `src/test/`:

```
src/test/
  globalSetup.ts
  __mocks__/
    openai.js        — mocks OpenAI SDK
    googleapis.js    — mocks Google APIs
```

## What each test layer covers

### `route.test.ts` — HTTP wire tests (lightweight)

Cover that the route is wired correctly and auth/permission gates work. Not the place for exhaustive business logic — that belongs in service and manager tests.

- **200/201** — correct user, valid input gets a successful response
- **401** — no token
- **403** — authenticated but no access
- **400** — invalid input (fails schema validation)

```typescript
const EMAIL_NS = 'test-jobs-route';

describe('job/route', () => {
  let token: string;
  let otherToken: string;
  let home: Home;
  let job: Job;

  beforeAll(async () => {
    await cleanup();
    const user = await userFactory.create({ email: `${EMAIL_NS}@example.com` });
    const other = await userFactory.create({ email: `${EMAIL_NS}-other@example.com` });
    token = await loginAs(`${EMAIL_NS}@example.com`);
    otherToken = await loginAs(`${EMAIL_NS}-other@example.com`);
    home = await homeFactory.create({}, { transient: { userId: user.id } });
    job = await jobFactory.create({ homeId: home.id, createdByUserId: user.id });
  });

  it('GET /jobs/:id returns the job for the owner', async () => {
    const res = await request(app)
      .get(`/api/v1/jobs/${job.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(job.id);
  });

  it('returns 401 with no token', async () => {
    const res = await request(app).get(`/api/v1/jobs/${job.id}`);
    expect(res.status).toBe(401);
  });

  it('returns 403 for a different user', async () => {
    const res = await request(app)
      .get(`/api/v1/jobs/${job.id}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 400 for missing required fields', async () => {
    const res = await request(app)
      .post(`/api/v1/homes/${home.id}/jobs`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '' });
    expect(res.status).toBe(400);
  });
});
```

### `service.test.ts` — mutation orchestration

Cover business logic: cache warming, cache invalidation, ownership rules, multi-step write outcomes. Use `jest.spyOn` to verify cache operations without mocking managers.

```typescript
describe('home/service', () => {
  let userId: string;
  let otherUserId: string;

  beforeAll(async () => {
    await cleanup();
    const user = await userFactory.create({ email: 'test-home-service@example.com' });
    const other = await userFactory.create({ email: 'test-home-service-other@example.com' });
    userId = user.id;
    otherUserId = other.id;
  });

  describe('createHome', () => {
    it('creates the home and warms the permission cache', async () => {
      const home = await homeService.createHome(userId, {
        name: 'Test Home', address1: '1 St', city: 'Austin', state: 'TX', zipCode: '78701',
      });
      expect(home.id).toBeDefined();
      // Cache warm — hasPermission should not hit DB
      const spy = jest.spyOn(UserHomeManager, 'findMembership');
      await PermissionService.check(HomeManager, userId, home.id);
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('deleteHome', () => {
    it('invalidates the permission cache', async () => {
      const home = await homeFactory.create({}, { transient: { userId } });
      PermissionService.set(userId, home.id);
      await homeService.deleteHome(home.id, userId);
      const spy = jest.spyOn(UserHomeManager, 'findMembership');
      await PermissionService.check(HomeManager, userId, home.id);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('throws if user is not the owner', async () => {
      const home = await homeFactory.create({}, { transient: { userId } });
      await expect(homeService.deleteHome(home.id, otherUserId)).rejects.toThrow();
    });
  });
});
```

### `ModelNameManager.test.ts` — unit tests

Most granular layer. Cover DB operations and permission predicates directly.

- CRUD: `create`, `findById`, `update`, `delete`
- `hasPermission`: true for owner/member, false for non-member, false for unknown ID
- `listForUser`: returns only rows visible to that user; ADMIN sees all

```typescript
describe('HomeManager', () => {
  let userId: string;
  let otherUserId: string;

  beforeAll(async () => {
    await cleanup();
    const user = await userFactory.create({ email: 'test-home-manager@example.com' });
    const other = await userFactory.create({ email: 'test-home-manager-other@example.com' });
    userId = user.id;
    otherUserId = other.id;
  });

  describe('hasPermission', () => {
    it('returns true for home member', async () => {
      const home = await homeFactory.create({}, { transient: { userId } });
      expect(await HomeManager.hasPermission(userId, home.id)).toBe(true);
    });

    it('returns false for non-member', async () => {
      const home = await homeFactory.create({}, { transient: { userId } });
      expect(await HomeManager.hasPermission(otherUserId, home.id)).toBe(false);
    });

    it('returns false for unknown id', async () => {
      expect(await HomeManager.hasPermission(userId, 'nonexistent-id')).toBe(false);
    });
  });

  describe('listForUser', () => {
    it('returns only homes the user is a member of', async () => {
      const home = await homeFactory.create({}, { transient: { userId } });
      const result = await HomeManager.listForUser(userId, UserRole.USER);
      expect(result.some((h) => h.id === home.id)).toBe(true);
    });

    it('returns all homes for ADMIN role', async () => {
      const home1 = await homeFactory.create({}, { transient: { userId } });
      const home2 = await homeFactory.create({}, { transient: { userId: otherUserId } });
      const result = await HomeManager.listForUser(userId, UserRole.ADMIN);
      const ids = result.map((h) => h.id);
      expect(ids).toContain(home1.id);
      expect(ids).toContain(home2.id);
    });
  });
});
```

## Factories

See `.ai/skills/api/factory.md` for the full factory pattern.

- **Persisted columns** (including FKs on the model row) → direct params: `jobFactory.create({ homeId: home.id })`
- **`transient`** → only for values that create related rows not owned by this model: `homeFactory.create({}, { transient: { userId } })`

## Cleanup pattern

Each test file owns a unique email namespace. `beforeAll` and `afterAll` delete by that namespace.

**Delete homes before users** — `Job.createdByUserId` has no cascade from `User`. Deleting a home cascades to all its jobs.

```typescript
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

## Running tests

```bash
make test-api                                              # all backend tests in Docker
# or inside the container:
NODE_OPTIONS="--max-old-space-size=3072" npx jest --runInBand --forceExit
npx jest src/job/__tests__/route.test.ts                   # single file
```
