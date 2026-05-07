---
name: testing
description: Guide for adding tests to a module. Use when creating a new module, adding test coverage, or writing factories.
---

# Testing Pattern

Tests and factories are colocated with the module they test. Every module has three subdirectories alongside `models/`, `route.ts`, `service.ts`.

## Directory structure per module

```
src/{module}/
  models/
    ModelName.ts
    ModelNameManager.ts
  factories/
    ModelName.factory.ts     ← one factory per model
  __tests__/
    ModelNameManager.test.ts ← unit tests: DB operations, hasPermission, listForUser
    service.test.ts          ← service layer: cache invalidation, orchestration
    route.test.ts            ← integration tests: HTTP via supertest, 401/403/200
```

Shared infrastructure lives in `src/test/`:
```
src/test/
  globalSetup.ts
  __mocks__/
    openai.js
    googleapis.js
```

## Factories

One factory file per model. Factories insert directly into the DB via managers, accept overrides, and return the created record.

```ts
// src/home/factories/Home.factory.ts
import { createId } from '@paralleldrive/cuid2';
import { HomeManager } from '../models/HomeManager';
import { UserHomeManager } from '../models/UserHomeManager';
import type { Home } from '../models/Home';

export async function createHome(userId: string, overrides?: Partial<{ name: string }>): Promise<Home> {
  const home = await HomeManager.create({
    id: createId(),
    name: overrides?.name ?? 'Test Home',
    address1: '123 Test St',
    address2: null,
    city: 'Austin',
    state: 'TX',
    zipCode: '78701',
    country: 'US',
    notes: null,
    updatedAt: new Date(),
  });
  await UserHomeManager.create({ userId, homeId: home.id, role: 'OWNER' });
  return home;
}
```

## Cleanup pattern

Each test file owns a unique email namespace. `beforeAll` and `afterAll` delete by that namespace.

**Important:** Delete homes before users — `Job.createdByUserId` has no cascade from `User`. Deleting a home cascades to all its jobs.

```ts
async function cleanup() {
  const testUsers = await db.select().from(users).where(like(users.email, 'test-{module}-route%'));
  for (const u of testUsers) {
    const uhs = await db.select().from(userHomes).where(eq(userHomes.userId, u.id));
    if (uhs.length) await db.delete(homes).where(inArray(homes.id, uhs.map((uh) => uh.homeId)));
  }
  await db.delete(users).where(like(users.email, 'test-{module}-route%'));
}
```

## What each test file covers

### `ModelNameManager.test.ts`
- CRUD methods: `findById`, `create`, `update`, `delete`
- `hasPermission`: true for owner/member, false for non-member, false for unknown ID
- `listForUser`: USER role returns scoped results, ADMIN role returns all

### `service.test.ts`
- Cache warming on create/add (`PermissionService.set`)
- Cache invalidation on delete/remove (`PermissionService.invalidate`)
- Ownership checks (e.g. only OWNER can delete)
- Use `jest.spyOn` to verify cache hits/misses without mocking managers

### `route.test.ts`
- Happy path: correct user gets 200/201
- `401` — no auth token
- `403` — authenticated but no access to the resource
- `400` — invalid input (schema validation)
- Use factories for setup, `loginAs` helper for tokens

## loginAs helper

```ts
async function loginAs(email: string) {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'password123' });
  return res.body.data.tokens.accessToken as string;
}
```

## Running tests

```bash
make test-api                          # all backend tests in Docker
# or inside the container:
NODE_OPTIONS="--max-old-space-size=3072" npx jest --runInBand --forceExit
npx jest src/home/__tests__/route.test.ts   # single file
```
